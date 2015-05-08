var SocketManager = new function(address){

	var socket = io.connect(address, {'sync disconnect on unload': true });
	var isJoined = false;

	this.On = function(event, cb){
		socket.on(event, call(event));

		function call(event){
			return function(data){
				if(isJoined){
					log("**remote event ["+event+"]: "+json(data));
					cb(data);
				}
				else if(event == "joined"){
					log("**remote event ["+event+"]: "+json(data));
					cb(data);
				}
			}
		}
	}

	this.Join = function(name, onSuccess, onError){

		socket.removeListener("joined", onSuccess);
		socket.removeListener("join-error", onError);

		socket.on("joined", function(clients){
			isJoined = true;
			onSuccess(clients);
		});
		socket.on("join-error", onError);
		socket.emit("join",name);
	}

	this.Leave = function(){
		socket.emit("leave");
		isJoined = false;
	}

	this.Dial = function(name){
		socket.emit("dial",name);
	}

	this.Hang = function(){
		socket.emit("hang");
	}

	this.Answer = function(){
		socket.emit("answer");
	}

	this.Send = function(data){
		socket.emit("message", data);
	}
}
