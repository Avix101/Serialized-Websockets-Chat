"use strict";

var username = void 0,
    message = void 0;
var connect = void 0,
    send = void 0;
var chatWindow = void 0;
var socket = void 0;

var appendChatWindow = function appendChatWindow(message) {
  chatWindow.value += message + "\n";
};

var messageTypeStruct = {
  "join": 0,
  "chatMessage": 1
};

var toSerializedByteArray = function toSerializedByteArray(type) {

  var bufferSize = 1;
  var data = void 0;

  switch (type) {
    case 0:
      {
        var user = arguments.length <= 1 ? undefined : arguments[1];
        var bytes = [];

        for (var i = 0; i < user.length; i++) {
          var charCode = user.charCodeAt(i);
          bufferSize++;
          bytes.push(charCode);
        }

        bufferSize += 2;

        var buffer = new ArrayBuffer(bufferSize);
        data = new DataView(buffer);

        data.setInt8(0, type);
        data.setInt16(1, bytes.length);

        var byteOffset = 3;

        for (var _i = 0; _i < bytes.length; _i++) {
          var character = bytes[_i];
          data.setInt8(byteOffset, character);
          byteOffset++;
        }

        break;
      }
    case 1:
      {
        var _message = arguments.length <= 1 ? undefined : arguments[1];
        var _bytes = [];

        for (var _i2 = 0; _i2 < _message.length; _i2++) {
          var _charCode = _message.charCodeAt(_i2);
          bufferSize++;
          _bytes.push(_charCode);
        }

        bufferSize += 2;

        var _buffer = new ArrayBuffer(bufferSize);
        data = new DataView(_buffer);

        data.setInt8(0, type);
        data.setInt16(1, _bytes.length);

        var _byteOffset = 3;

        for (var _i3 = 0; _i3 < _bytes.length; _i3++) {
          var _character = _bytes[_i3];
          data.setInt8(_byteOffset, _character);
          _byteOffset++;
        }

        break;
      }
  };

  return data;
};

var connectSocket = function connectSocket(e) {

  var user = username.value;

  if (!user) {
    appendChatWindow("Please specify a username!");
    return;
  }

  socket = io.connect();

  socket.on('connect', function () {
    appendChatWindow("Connecting to server...");

    var joinMessage = toSerializedByteArray(messageTypeStruct["join"], user);

    socket.emit('message', joinMessage.buffer);

    socket.on('message', function (buffer) {

      var decoder = new TextDecoder();
      var data = new DataView(buffer);

      console.log(buffer);

      var type = data.getInt8(0);

      switch (type) {
        case 0:
          var length = data.getInt16(1);
          var serverMessage = decoder.decode(new DataView(buffer, 3, length));
          appendChatWindow("Server: " + serverMessage);
          break;
        case 1:
          var userLength = data.getInt16(1);
          var _user = decoder.decode(new DataView(buffer, 3, userLength));

          var messageLength = data.getInt16(userLength + 3);
          var _message2 = decoder.decode(new DataView(buffer, 5 + userLength, messageLength));

          appendChatWindow(_user + ": " + _message2);
          break;
      };
    });

    send.addEventListener('click', function (e) {

      if (message.value == "") {
        return;
      }

      var chatMessage = toSerializedByteArray(messageTypeStruct["chatMessage"], message.value);
      message.value = "";
      socket.emit('message', chatMessage.buffer);
    });
  });
};

var init = function init() {
  username = document.querySelector("#username");
  message = document.querySelector("#message");

  connect = document.querySelector("#connect");
  send = document.querySelector("#send");

  chatWindow = document.querySelector("#chatWindow");

  connect.addEventListener('click', connectSocket);
};

window.onload = init;
