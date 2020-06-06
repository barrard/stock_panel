import io from 'socket.io-client'

const Events = {}

const Socket = {
    socket:null,
    connect(){
        if(this.socket) return
        this.socket = io(process.env.REACT_APP_STOCK_DATA_URL);

    },
    connected:false,
    emit:(event, data)=>{
        this.socket.emit(event, data)
    },
    on:(event, fn)=>{
        if(!Events[event]){
            Events[event] = fn
            Socket.socket.on(event, fn)
        }
    },
    off:(event)=> {
        console.log({event})
        console.log(typeof(Events[event]))
        if(typeof(Events[event]==='function')){
            
            Events[event] = null
            Socket.socket.off(event)
        }
    }
}

Socket.connect()
Socket.on('connect', ()=>console.log('Websocket connected'))

export default Socket

