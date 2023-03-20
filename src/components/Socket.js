import io from "socket.io-client";

const Events = {};

const Socket = {
    socket: null,
    connect() {
        if (this.socket) return;
        this.socket = io(process.env.REACT_APP_STOCK_DATA_URL);
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
        if (!Events[event]) {
            Events[event] = fn;
            Socket.socket.on(event, fn);
        }
    },
    off: (event) => {
        // console.log({ event });
        // console.log(typeof Events[event]);
        if (typeof (Events[event] === "function")) {
            Events[event] = null;
            Socket.socket.off(event);
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
