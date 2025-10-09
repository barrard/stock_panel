import io from "socket.io-client";

const Events = {}; // Now stores arrays of handlers per event

const Socket = {
    socket: null,
    connect() {
        if (this.socket) return;
        this.socket = io(process.env.REACT_APP_STOCK_DATA_URL, {
            transports: ["websocket"],
            upgrade: false, // Prevents falling back to polling
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
            console.log(`[Socket.on] Creating new event handler array: ${event}`);
        }

        // Check if this specific handler is already registered
        if (Events[event].includes(fn)) {
            console.log(`[Socket.on] Handler already registered for event: ${event}`);
            return;
        }

        // Add handler to array
        Events[event].push(fn);
        console.log(`[Socket.on] Registered handler #${Events[event].length} for event: ${event}`);

        // Register with socket.io (only once per event, not per handler)
        if (Events[event].length === 1) {
            // First handler for this event - register a multiplexer
            const multiplexer = (data) => {
                // Call all registered handlers
                Events[event].forEach(handler => {
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
        console.log(`[Socket.off] Removing handler from event: ${event}, exists: ${!!Events[event]}`);

        if (!Events[event] || !Array.isArray(Events[event])) {
            console.log(`[Socket.off] Event not found: ${event}`);
            return;
        }

        if (fn) {
            // Remove specific handler
            const index = Events[event].indexOf(fn);
            if (index > -1) {
                Events[event].splice(index, 1);
                console.log(`[Socket.off] Removed specific handler, ${Events[event].length} handlers remaining for: ${event}`);
            }
        } else {
            // Remove all handlers (legacy behavior for backwards compatibility)
            console.log(`[Socket.off] Removing all handlers for: ${event}`);
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
            console.log(`[Socket.off] Event fully unregistered: ${event}`);
        }
    },
    onConnect: {},
};

Socket.connect();
Socket.on("connect", () => {
    Socket.connected = true;

    console.log("Websocket connected");
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
