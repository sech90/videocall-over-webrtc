var app = require('express')();

var Client = function(name, socket){
	this.name = name;
	this.socket = socket;
	this.status = "available";
	this.connectedWith = null;
}

var clients = [];

function start(app){
	
	var io = require('socket.io')(app);
	io.on('connection', function (socket) {

		socket.on("message", function(data){
			var sender = clients[socket.name];
			var receiver = sender.connectedWith;
			if(!sender){
				socket.emit("error-mex","Please join in order to send messages");
			}
			else if(!receiver){
				socket.emit("error-mex","message destination "+data.to+" unknown");
			}
			else
				receiver.socket.emit("message",data);
		});

		socket.on('join', function (name) {
			if(clients[name])
				socket.emit("join-error", "name "+name+" taken");
			else{
				
				var AllClients = GetClientsInfo();
				var client = new Client(name, socket);
				clients[name] = client;
				socket.name = name;
				socket.emit("joined", AllClients);
				socket.broadcast.emit('client-connected', GetClientInfo(client));
			}

		socket.on("dial", function(name){
			var caller = clients[socket.name];
			var callee = clients[name];
			if(!callee)
				socket.emit("error-mex","client with name "+name+" is not online");
			else if(callee.status != "available")
				socket.emit("error-mex","client with name "+name+" is not available");
			else
				makeCall(caller, callee);
		});

		socket.on("answer", function(){
			var callee = clients[socket.name];

			if(callee.status != "dialling")
				socket.emit("error-mex","Cannot answer to a non existing call");
			else{

				var caller = callee.connectedWith;
				if(caller.status == "dialling")
					answerCall(caller, callee);
			}
		});

		socket.on("hang", function(){
			var client = clients[socket.name];
			var connectedCli = client.connectedWith;

			if(!connectedCli)
				socket.emit("error-mex","not connected");
			else
				hang(client, connectedCli);
		});

		socket.on("leave",onDisconnect); 
		socket.on("disconnect",onDisconnect);

		function onDisconnect(){
			var client = clients[socket.name];

			if(client){
				if(client.status != "available")
					hang(client, client.connectedWith);
				
				delete clients[socket.name];
				socket.broadcast.emit('client-disconnected', socket.name);
			}
		}
	});


	});

}

function makeCall(caller, callee){

	caller.connectedWith = callee;
	callee.connectedWith = caller;

	caller.socket.emit("local-dialling", callee.name);
	callee.socket.emit("remote-incoming", caller.name);

	ChangeStatus(caller,"dialling");
	ChangeStatus(callee,"dialling");
}

function answerCall(caller, callee){

	caller.socket.emit("remote-answer", callee.name);
	callee.socket.emit("local-answer", caller.name);

	ChangeStatus(caller,"busy");
	ChangeStatus(callee,"busy");
}

function hang(client){
	var otherCli = client.connectedWith;

	client.socket.emit("local-hang", otherCli.name);
	otherCli.socket.emit("remote-hang", client.name);

	client.connectedWith = null;
	otherCli.connectedWith = null;

	ChangeStatus(client,"available");
	ChangeStatus(otherCli,"available");
}

function ChangeStatus(client, newStatus){
	client.status = newStatus;

	var data = {
		name : client.name,
		status: newStatus
	};

	client.socket.broadcast.emit("client-status", data);
}

function GetClientsInfo(){

	var info = [];
	for(var key in clients)
		info.push(GetClientInfo(clients[key]));
		
	return info;
}

function GetClientInfo(client){
	return {name: client.name, status: client.status};
}

exports.start = start;