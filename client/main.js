let username, message;
let connect, send;
let chatWindow;
let socket;

const appendChatWindow = (message) => {
  chatWindow.value += `${message}\n`;
};

const messageTypeStruct = {
  "join": 0,
  "chatMessage": 1,
  "getTime": 2,
  "fancyMessage": 3,
  "privateMessage": 4,
}

const doubleParamByteArray = (type, str1, str2) => {
  let bufferSize = 1;
  const bytes1 = [];
  const bytes2 = [];
  
  for(let i = 0; i < str1.length; i++){
    const charCode = str1.charCodeAt(i);
    bufferSize++;
    bytes1.push(charCode);
  }
  
  for(let i = 0; i < str2.length; i++){
    const charCode = str2.charCodeAt(i);
    bufferSize++;
    bytes2.push(charCode);
  }
  
  bufferSize += 4;
  
  const buffer = new ArrayBuffer(bufferSize);
  const data = new DataView(buffer);
  
  data.setInt8(0, type);
  data.setInt16(1, bytes1.length);
  
  let byteOffset = 3;
  
  for(let i = 0; i < bytes1.length; i++){
    const character = bytes1[i];
    data.setInt8(byteOffset, character);
    byteOffset++;
  }
  
  data.setInt16(byteOffset, bytes2.length);
  byteOffset += 2;
  
  for(let i = 0; i < bytes2.length; i++){
    const character = bytes2[i];
    data.setInt8(byteOffset, character);
    byteOffset++;
  }
  
  return data;
};  

const singleParamByteArray = (type, str) => {
  
  let bufferSize = 1;
  const bytes = [];
      
  for(let i = 0; i < str.length; i++){
    const charCode = str.charCodeAt(i);
    bufferSize++;
    bytes.push(charCode);
  }
  
  bufferSize += 2;
  
  const buffer = new ArrayBuffer(bufferSize);
  const data = new DataView(buffer);
  
  data.setInt8(0, type);
  data.setInt16(1, bytes.length);
  
  let byteOffset = 3;
  
  for(let i = 0; i < bytes.length; i++){
    const character = bytes[i];
    data.setInt8(byteOffset, character);
    byteOffset++;
  }
  
  return data;
};

const singleByteArray = (type) => {
  const buffer = new ArrayBuffer(1);
  const data = new DataView(buffer);
  data.setInt8(0, type);
  return data;
};

const toSerializedByteArray = (type, ...args) => {  
  let byteArray;
  switch(type){
    case 0: {
      const user = args[0];
      byteArray = singleParamByteArray(type, user);
      break;
    }
    case 1: {
      const message = args[0];
      byteArray = singleParamByteArray(type, message);
      break;
    }
    case 2: {
      byteArray = singleByteArray(type);
      break;
    }
    case 3: {
      const message = args[0];
      byteArray = singleParamByteArray(type, message);
      break;
    }
    case 4: {
      const user = args[0];
      const message = args[1];
      byteArray = doubleParamByteArray(type, user, message);
      break;
    }
    
    default: {
      break;
    }
  };
  
  return byteArray;
};

const connectSocket = (e) => {
  
  let user = username.value;
  
  if(!user){
    appendChatWindow("Please specify a username!");
    return;
  }
  
  socket = io.connect();
  
  socket.on('connect', () => {
    appendChatWindow("Connecting to server...");
    
    const joinMessage = toSerializedByteArray(messageTypeStruct["join"], user);
    
    socket.emit('message', joinMessage.buffer);
    
    socket.on('message', (buffer) => {
      
      const decoder = new TextDecoder();
      const data = new DataView(buffer);
      
      const type = data.getInt8(0);
      
      switch(type){
        case 0: {
          const length = data.getInt16(1);
          const serverMessage = decoder.decode(new DataView(buffer, 3, length));
          appendChatWindow(`Server: ${serverMessage}`);
          break;
        }
        case 1: {
          const userLength = data.getInt16(1);
          const user = decoder.decode(new DataView(buffer, 3, userLength));
          
          const messageLength = data.getInt16(userLength + 3);
          const message = decoder.decode(new DataView(buffer, 5 + userLength, messageLength));
          
          appendChatWindow(`${user}: ${message}`);
          break;
        }
        case 2: {
          const userLength = data.getInt16(1);
          const user = decoder.decode(new DataView(buffer, 3, userLength));
          
          const messageLength = data.getInt16(userLength + 3);
          const message = decoder.decode(new DataView(buffer, 5 + userLength, messageLength));
          
          appendChatWindow(`***Whispher*** from ${user}: ${message}`);
          break; 
        }
      };
      
    });
    
    send.addEventListener('click', (e) => {
      
      if(message.value == ""){
        return;
      }
      
      if(message.value.charAt(0) === '/'){
        if(message.value.includes("/time")){
          
          const serverCommand = toSerializedByteArray(messageTypeStruct["getTime"]);
          socket.emit('message', serverCommand.buffer);
        } else if(message.value.includes("/fancy")){
          const text = message.value.replace("/fancy ", "");
          const fancyMessage = toSerializedByteArray(messageTypeStruct["fancyMessage"], text);
          socket.emit('message', fancyMessage.buffer);
        } else if(message.value.includes("/pm")){
          if(!message.value.includes(" [") || !message.value.includes("] ")){
            appendChatWindow("To pm: '/pm [user] message'");
            return;
          }
          
          let parsedCommand = message.value.split('[')[1];
          parsedCommand = parsedCommand.split(']');
          let userText = parsedCommand[0];
          let messageText = parsedCommand[1].substr(1);
          
          const privateMessage = toSerializedByteArray(
            messageTypeStruct["privateMessage"], 
            userText, 
            messageText
          );
          
          socket.emit('message', privateMessage.buffer);
        }
      } else {
        const chatMessage = toSerializedByteArray(messageTypeStruct["chatMessage"], message.value);
        socket.emit('message', chatMessage.buffer);
      }
      
      message.value = "";
    });
  });
};

const init = () => {
  username = document.querySelector("#username");
  message = document.querySelector("#message");
  
  connect = document.querySelector("#connect");
  send = document.querySelector("#send");
  
  chatWindow = document.querySelector("#chatWindow");
  
  connect.addEventListener('click', connectSocket);
};

window.onload = init;