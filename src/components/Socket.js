import io from 'socket.io-client'
const socket = io("https://stocks.dakine.website");
// const socket = io("http://192.168.0.11:45678");

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
        console.log(typeof(Events[event]))
        if(typeof(Events[event]==='function')){
            
            Events[event] = null
            socket.off(event)
        }
    }
}

export default Socket