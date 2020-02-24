import io from 'socket.io-client'
const socket = io(process.env.REACT_APP_STOCK_DATA_URL);

const Events = {}

const Socket = {
    emit:(event, data)=>{
        socket.emit(event, data)
    },
    on:(event, fn)=>{
        if(!Events[event]){
            Events[event] = fn
            socket.on(event, fn)
        }
    },
    off:(event)=> {
        console.log({event})
        console.log(typeof(Events[event]))
        if(typeof(Events[event]==='function')){
            
            Events[event] = null
            socket.off(event)
        }
    }
}

Socket.on('connect', ()=>console.log('Websocket connected'))

export default Socket

