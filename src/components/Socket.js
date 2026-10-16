import io from "socket.io-client";

const Events = {}; // Now stores arrays of handlers per event

// Server-side subscriptions (TD_service_lite SOCKET_SUBSCRIPTIONS_PLAN.md §5).
// key → { req: { channel, ...params }, count }. Ref-counted so two components on the same room don't unsubscribe
// each other, and replayed on every `connect` because rooms are per socket and lost on reconnect.
const Subscriptions = new Map();
const ACK_TIMEOUT_MS = 5000;

// Until every consumer subscribes, REACT_APP_SOCKET_LEGACY=true keeps the old "send me everything" behaviour.
const NO_LEGACY = process.env.REACT_APP_SOCKET_LEGACY !== "true";

const normalizeRequest = (channel, params = {}) => {
    const req = { channel, ...params };
    if (req.symbol !== undefined && req.symbol !== null) req.symbol = `${req.symbol}`.trim().toUpperCase();
    return req;
};
const subscriptionKey = (req) => JSON.stringify(Object.keys(req).sort().map((k) => [k, req[k]]));
const describe = ({ channel, ...params }) => [channel, ...Object.values(params)].join(":");

const sendSubscription = (action, req) => {
    let acked = false;
    const timer = setTimeout(() => {
        if (!acked) console.warn(`[Socket] ⚠️ ${action} ${describe(req)}: no ack after ${ACK_TIMEOUT_MS / 1000}s (server outdated?)`);
    }, ACK_TIMEOUT_MS);
    Socket.socket.emit(action, req, (res) => {
        acked = true;
        clearTimeout(timer);
        if (!res?.ok) console.warn(`[Socket] ⚠️ ${action} ${describe(req)} failed: ${res?.error}`);
    });
};

const Socket = {
    socket: null,
    connect() {
        if (this.socket) return;
        this.socket = io(process.env.REACT_APP_STOCK_DATA_URL, {
            transports: ["websocket"],
            upgrade: false, // Prevents falling back to polling
            ...(NO_LEGACY && { query: { noLegacy: 1 } }), // only receive per-symbol market data we subscribed to
        });
    },
    connected: false,
    emit: function (event, data) {
        if (!Socket.connected) {
            //register for after connected
            Socket.onConnect[event] = data;
        } else {
            this.socket.emit(event, data);
        }
    },
    on: (event, fn) => {
        // Initialize event array if it doesn't exist
        if (!Events[event]) {
            Events[event] = [];
            // console.log(`[Socket.on] Creating new event handler array: ${event}`);
        }

        // Check if this specific handler is already registered
        if (Events[event].includes(fn)) {
            // console.log(`[Socket.on] Handler already registered for event: ${event}`);
            return;
        }

        // Add handler to array
        Events[event].push(fn);
        // console.log(`[Socket.on] Registered handler #${Events[event].length} for event: ${event}`);

        // Register with socket.io (only once per event, not per handler)
        if (Events[event].length === 1) {
            // First handler for this event - register a multiplexer
            const multiplexer = (data) => {
                // Call all registered handlers
                Events[event].forEach((handler) => {
                    try {
                        handler(data);
                    } catch (error) {
                        console.error(`[Socket] Error in handler for ${event}:`, error);
                    }
                });
            };
            Socket.socket.on(event, multiplexer);
            Events[event]._multiplexer = multiplexer; // Store reference for cleanup
        }
    },
    off: (event, fn) => {
        // console.log(`[Socket.off] Removing handler from event: ${event}, exists: ${!!Events[event]}`);

        if (!Events[event] || !Array.isArray(Events[event])) {
            console.log(`[Socket.off] Event not found: ${event}`);
            return;
        }

        if (fn) {
            // Remove specific handler
            const index = Events[event].indexOf(fn);
            if (index > -1) {
                Events[event].splice(index, 1);
                // console.log(`[Socket.off] Removed specific handler, ${Events[event].length} handlers remaining for: ${event}`);
            }
        } else {
            // Remove all handlers (legacy behavior for backwards compatibility)
            // console.log(`[Socket.off] Removing all handlers for: ${event}`);
            Events[event] = [];
        }

        // If no handlers remain, unregister from socket.io
        if (Events[event].length === 0) {
            if (Events[event]._multiplexer) {
                Socket.socket.off(event, Events[event]._multiplexer);
            } else {
                Socket.socket.off(event);
            }
            delete Events[event];
            // console.log(`[Socket.off] Event fully unregistered: ${event}`);
        }
    },
    // Join a server channel room, e.g. subscribe("lastTrade", { symbol: "ES" }) or subscribe("bars", { symbol, tf: "1m" }).
    // Returns a release function (same as calling unsubscribe with the same args), handy as a useEffect cleanup.
    subscribe(channel, params = {}) {
        const req = normalizeRequest(channel, params);
        if (!channel || ("symbol" in req && !req.symbol)) return () => {};
        const key = subscriptionKey(req);
        const entry = Subscriptions.get(key);
        if (entry) {
            entry.count++;
        } else {
            Subscriptions.set(key, { req, count: 1 });
            if (Socket.socket?.connected) sendSubscription("subscribe", req);
        }
        let released = false;
        return () => {
            if (released) return;
            released = true;
            Socket.unsubscribe(channel, params);
        };
    },
    unsubscribe(channel, params = {}) {
        const req = normalizeRequest(channel, params);
        const key = subscriptionKey(req);
        const entry = Subscriptions.get(key);
        if (!entry || --entry.count > 0) return;
        Subscriptions.delete(key);
        if (Socket.socket?.connected) sendSubscription("unsubscribe", req);
    },
    // The server reads the login session from the handshake cookie, so after login/logout reconnect to pick it up.
    // Subscriptions replay on the new connect (the private "account" channel only succeeds for allowed users).
    reauth() {
        if (!Socket.socket) return;
        console.log("[Socket] 🔑 reconnecting to refresh the session");
        Socket.socket.disconnect();
        Socket.socket.connect();
    },
    subscribeLiquidity(symbol) {
        Socket.subscribe("liquidity", { symbol });
    },
    unsubscribeLiquidity(symbol) {
        Socket.unsubscribe("liquidity", { symbol });
    },
    subscribeDepthSummary(symbol) {
        Socket.subscribe("depthSummary", { symbol });
    },
    unsubscribeDepthSummary(symbol) {
        Socket.unsubscribe("depthSummary", { symbol });
    },
    onConnect: {},
};

Socket.connect();
Socket.on("connect", () => {
    Socket.connected = true;

    console.log("Websocket connected");
    Subscriptions.forEach(({ req }) => sendSubscription("subscribe", req));
    if (Subscriptions.size) console.log(`[Socket] 🔔 subscribed: ${[...Subscriptions.values()].map(({ req }) => describe(req)).join(", ")}`);
    if (Object.keys(Socket.onConnect).length) {
        Object.keys(Socket.onConnect).forEach((event) => {
            const data = Socket.onConnect[event];
            Socket.emit(event, data);
        });
    }
});

Socket.on("disconnect", (d) => {
    console.log(`Socket Disconnected ${d}`);
});

export default Socket;
