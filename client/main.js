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
}

const toSerializedByteArray = (type, ...args) => {
  
  let bufferSize = 1;
  let data;
  
  switch(type){
    case 0: {
      const user = args[0];
      const bytes = [];
      
      for(let i = 0; i < user.length; i++){
        const charCode = user.charCodeAt(i);
        bufferSize ++;
        bytes.push(charCode);
      }
      
      bufferSize += 2;
      
      const buffer = new ArrayBuffer(bufferSize);
      data = new DataView(buffer);
      
      data.setInt8(0, type);
      data.setInt16(1, bytes.length);
      
      let byteOffset = 3;
      
      for(let i = 0; i < bytes.length; i++){
        const character = bytes[i];
        data.setInt8(byteOffset, character);
        byteOffset++;
      }
      
      break;
    }
    case 1: {
      const message = args[0];
      const bytes = [];
      
      for(let i = 0; i < message.length; i++){
        const charCode = message.charCodeAt(i);
        bufferSize++;
        bytes.push(charCode);
      }
      
      bufferSize += 2;
      
      const buffer = new ArrayBuffer(bufferSize);
      data = new DataView(buffer);
      
      data.setInt8(0, type);
      data.setInt16(1, bytes.length);
      
      let byteOffset = 3;
      
      for(let i = 0; i < bytes.length; i++){
        const character = bytes[i];
        data.setInt8(byteOffset, character);
        byteOffset++;
      }
      
      break;
    }
  };
  
  return data;
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
      
      console.log(buffer);
      
      const type = data.getInt8(0);
      
      switch(type){
        case 0:
          const length = data.getInt16(1);
          const serverMessage = decoder.decode(new DataView(buffer, 3, length));
          appendChatWindow(`Server: ${serverMessage}`);
          break;
        case 1:
          const userLength = data.getInt16(1);
          const user = decoder.decode(new DataView(buffer, 3, userLength));
          
          const messageLength = data.getInt16(userLength + 3);
          const message = decoder.decode(new DataView(buffer, 5 + userLength, messageLength));
          
          appendChatWindow(`${user}: ${message}`);
          break;
      };
      
    });
    
    send.addEventListener('click', (e) => {
      
      if(message.value == ""){
        return;
      }
      
      const chatMessage = toSerializedByteArray(messageTypeStruct["chatMessage"], message.value);
      message.value = "";
      socket.emit('message', chatMessage.buffer);
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