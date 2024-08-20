const { Server } = require("socket.io");

const { get_conf, get_redis_subscriber } = require("../node_utils");
const conf = get_conf();

console.log("开始加载3： SocketIO server started on port " + conf.socketio_port);

let io = new Server({
	cors: {
		// Should be fine since we are ensuring whether hostname and origin are same before adding setting listeners for s socket
		// origin: true,
		origin: [
                "https://erp.hbbbl.top:442",
                "http://erp15.hbbbl.top:82",
                "http://192.168.1.180:8090", 
                "http://erp.v16:8000",
                "http://127.0.0.1:8000",
                "https://erpdev.hbbbl.top:8443/", 
                
            ],
		credentials: true,
	},
	cleanupEmptyChildNamespaces: true,
});

// Multitenancy implementation.
// allow arbitrary sitename as namespaces
// namespaces get validated during authentication.
const realtime = io.of(/^\/.*$/);

// load and register middlewares
const authenticate = require("./middlewares/authenticate");
realtime.use(authenticate);
// =======================

let socketio_conn_cnt = 0;
// load and register handlers
const frappe_handlers = require("./handlers/frappe_handlers");
function on_connection(socket) {
    console.log("SocketIO connection established, cnt:" + (++socketio_conn_cnt));
	frappe_handlers(realtime, socket);

	// ESBUild "open in editor" on error
	socket.on("open_in_editor", async (data) => {
		await subscriber.connect();
		subscriber.publish("open_in_editor", JSON.stringify(data));
	});
    socket.on("disconnect", (reason) => {
        console.log("SocketIO Client disconnect, cnt:" + (--socketio_conn_cnt), reason);
    });
    socket.onAny((event, ...args) => {
        console.log(`  ->from SocketIO Client event: ${event}, args: ${args}`);
    })
}

realtime.on("connection", on_connection);
// realtime.on("disconnect", () => {
//     console.log("SocketIO Client disconnect, cnt:" + (--socketio_conn_cnt));
// });
// =======================

// Consume events sent from python via redis pub-sub channel.
const subscriber = get_redis_subscriber();

(async () => {
	await subscriber.connect();
	subscriber.subscribe("events", (message) => {
		message = JSON.parse(message);
        console.log("收到后端 rt_msg:", message)
		let namespace = "/" + message.namespace;
		if (message.room) {
			io.of(namespace).to(message.room).emit(message.event, message.message);
		} else {
			// publish to ALL sites only used for things like build event.
			realtime.emit(message.event, message.message);
		}
	});
})();
// =======================

let port = conf.socketio_port;
io.listen(port);
console.log("Realtime service listening on: ", port);
