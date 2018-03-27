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
  "chatMessage": 1,
  "getTime": 2,
  "fancyMessage": 3,
  "privateMessage": 4
};

var doubleParamByteArray = function doubleParamByteArray(type, str1, str2) {
  var bufferSize = 1;
  var bytes1 = [];
  var bytes2 = [];

  for (var i = 0; i < str1.length; i++) {
    var charCode = str1.charCodeAt(i);
    bufferSize++;
    bytes1.push(charCode);
  }

  for (var _i = 0; _i < str2.length; _i++) {
    var _charCode = str2.charCodeAt(_i);
    bufferSize++;
    bytes2.push(_charCode);
  }

  bufferSize += 4;

  var buffer = new ArrayBuffer(bufferSize);
  var data = new DataView(buffer);

  data.setInt8(0, type);
  data.setInt16(1, bytes1.length);

  var byteOffset = 3;

  for (var _i2 = 0; _i2 < bytes1.length; _i2++) {
    var character = bytes1[_i2];
    data.setInt8(byteOffset, character);
    byteOffset++;
  }

  data.setInt16(byteOffset, bytes2.length);
  byteOffset += 2;

  for (var _i3 = 0; _i3 < bytes2.length; _i3++) {
    var _character = bytes2[_i3];
    data.setInt8(byteOffset, _character);
    byteOffset++;
  }

  return data;
};

var singleParamByteArray = function singleParamByteArray(type, str) {

  var bufferSize = 1;
  var bytes = [];

  for (var i = 0; i < str.length; i++) {
    var charCode = str.charCodeAt(i);
    bufferSize++;
    bytes.push(charCode);
  }

  bufferSize += 2;

  var buffer = new ArrayBuffer(bufferSize);
  var data = new DataView(buffer);

  data.setInt8(0, type);
  data.setInt16(1, bytes.length);

  var byteOffset = 3;

  for (var _i4 = 0; _i4 < bytes.length; _i4++) {
    var character = bytes[_i4];
    data.setInt8(byteOffset, character);
    byteOffset++;
  }

  return data;
};

var singleByteArray = function singleByteArray(type) {
  var buffer = new ArrayBuffer(1);
  var data = new DataView(buffer);
  data.setInt8(0, type);
  return data;
};

var toSerializedByteArray = function toSerializedByteArray(type) {
  var byteArray = void 0;
  switch (type) {
    case 0:
      {
        var user = arguments.length <= 1 ? undefined : arguments[1];
        byteArray = singleParamByteArray(type, user);
        break;
      }
    case 1:
      {
        var _message = arguments.length <= 1 ? undefined : arguments[1];
        byteArray = singleParamByteArray(type, _message);
        break;
      }
    case 2:
      {
        byteArray = singleByteArray(type);
        break;
      }
    case 3:
      {
        var _message2 = arguments.length <= 1 ? undefined : arguments[1];
        byteArray = singleParamByteArray(type, _message2);
        break;
      }
    case 4:
      {
        var _user = arguments.length <= 1 ? undefined : arguments[1];
        var _message3 = arguments.length <= 2 ? undefined : arguments[2];
        byteArray = doubleParamByteArray(type, _user, _message3);
        break;
      }

    default:
      {
        break;
      }
  };

  return byteArray;
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

      var type = data.getInt8(0);

      switch (type) {
        case 0:
          {
            var length = data.getInt16(1);
            var serverMessage = decoder.decode(new DataView(buffer, 3, length));
            appendChatWindow("Server: " + serverMessage);
            break;
          }
        case 1:
          {
            var userLength = data.getInt16(1);
            var _user2 = decoder.decode(new DataView(buffer, 3, userLength));

            var messageLength = data.getInt16(userLength + 3);
            var _message4 = decoder.decode(new DataView(buffer, 5 + userLength, messageLength));

            appendChatWindow(_user2 + ": " + _message4);
            break;
          }
        case 2:
          {
            var _userLength = data.getInt16(1);
            var _user3 = decoder.decode(new DataView(buffer, 3, _userLength));

            var _messageLength = data.getInt16(_userLength + 3);
            var _message5 = decoder.decode(new DataView(buffer, 5 + _userLength, _messageLength));

            appendChatWindow("***Whispher*** from " + _user3 + ": " + _message5);
            break;
          }
      };
    });

    send.addEventListener('click', function (e) {

      if (message.value == "") {
        return;
      }

      if (message.value.charAt(0) === '/') {
        if (message.value.includes("/time")) {

          var serverCommand = toSerializedByteArray(messageTypeStruct["getTime"]);
          socket.emit('message', serverCommand.buffer);
        } else if (message.value.includes("/fancy")) {
          var text = message.value.replace("/fancy ", "");
          var fancyMessage = toSerializedByteArray(messageTypeStruct["fancyMessage"], text);
          socket.emit('message', fancyMessage.buffer);
        } else if (message.value.includes("/pm")) {
          if (!message.value.includes(" [") || !message.value.includes("] ")) {
            appendChatWindow("To pm: '/pm [user] message'");
            return;
          }

          var parsedCommand = message.value.split('[')[1];
          parsedCommand = parsedCommand.split(']');
          var userText = parsedCommand[0];
          var messageText = parsedCommand[1].substr(1);

          var privateMessage = toSerializedByteArray(messageTypeStruct["privateMessage"], userText, messageText);

          socket.emit('message', privateMessage.buffer);
        }
      } else {
        var chatMessage = toSerializedByteArray(messageTypeStruct["chatMessage"], message.value);
        socket.emit('message', chatMessage.buffer);
      }

      message.value = "";
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
