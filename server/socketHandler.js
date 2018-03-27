const users = {};
const userNameRef = {};
const room = 'global-room';

let io;

const convertToServerMessage = (message) => {
  const code = 0;
  const messageBuffer = Buffer.from(message, 'utf-8');
  const messageLength = messageBuffer.byteLength;

  const finalBuffer = Buffer.alloc(messageLength + 3);
  finalBuffer.writeInt8(code);
  finalBuffer.writeInt16BE(messageLength, 1);
  messageBuffer.copy(finalBuffer, 3);

  return finalBuffer;
};

const convertToChatMessage = (user, message, privateFlag) => {
  let code = 1;

  if (privateFlag === true) {
    code = 2;
  }

  const userBuffer = Buffer.from(user, 'utf-8');
  const userLength = userBuffer.byteLength;

  const messageBuffer = Buffer.from(message, 'utf-8');
  const messageLength = messageBuffer.byteLength;

  const finalBuffer = Buffer.alloc(userLength + messageLength + 5);
  finalBuffer.writeInt8(code);
  finalBuffer.writeInt16BE(userLength, 1);
  userBuffer.copy(finalBuffer, 3);

  finalBuffer.writeInt16BE(messageLength, userLength + 3);
  messageBuffer.copy(finalBuffer, userLength + 5);

  return finalBuffer;
};

const init = (ioInstance) => {
  io = ioInstance;

  io.sockets.on('connection', (sock) => {
    const socket = sock;

    socket.on('message', (data) => {
      const buffer = data;

      const type = buffer.readInt8(0);

      switch (type) {
        case 0: {
          const length = buffer.readInt16BE(1);
          let user = '';

          for (let i = 0; i < length; i++) {
            user += `${String.fromCharCode(buffer.readInt8(i + 3))}`;
          }

          socket.name = user;
          userNameRef[user] = socket;
          users[socket.id] = socket;

          socket.join(room);
          socket.roomJoined = room;

          const welcomeMessage = convertToServerMessage(`Welcome! There are ${Object.keys(users).length} users online currently`);
          socket.emit('message', welcomeMessage);

          const joinMessage = convertToServerMessage(`${user} has joined the room!`);
          socket.broadcast.to(room).emit('message', joinMessage);
          break;
        }
        case 1: {
          const length = buffer.readInt16BE(1);
          let userMessage = '';

          for (let i = 0; i < length; i++) {
            userMessage += `${String.fromCharCode(buffer.readInt8(i + 3))}`;
          }

          const chatRoomMessage = convertToChatMessage(
            socket.name,
            userMessage,
          );

          io.sockets.in(room).emit('message', chatRoomMessage);
          break;
        }
        case 2: {
          const timeMessage = convertToServerMessage(`The current server time is: ${new Date().toLocaleTimeString()}`);
          socket.emit('message', timeMessage);
          break;
        }
        case 3: {
          const length = buffer.readInt16BE(1);
          let userMessage = '';

          for (let i = 0; i < length; i++) {
            userMessage += `${String.fromCharCode(buffer.readInt8(i + 3))}`;
          }

          const prepend = "×,.·´¨'°÷·..§";
          const append = "§.·´¨'°÷·..×";

          const chatRoomMessage = convertToChatMessage(
            socket.name,
            `${prepend}${userMessage.toUpperCase()}${append}`,
          );

          io.sockets.in(room).emit('message', chatRoomMessage);
          break;
        }
        case 4: {
          const userLength = buffer.readInt16BE(1);
          let user = '';

          for (let i = 0; i < userLength; i++) {
            user += `${String.fromCharCode(buffer.readInt8(i + 3))}`;
          }

          const messageLength = buffer.readInt16BE(userLength + 3);
          let message = '';

          for (let i = 0; i < messageLength; i++) {
            message += `${String.fromCharCode(buffer.readInt8(i + 5 + userLength))}`;
          }

          if (userNameRef[user]) {
            const privateMessage = convertToChatMessage(
              socket.name,
              message,
              true,
            );

            const successMessage = convertToServerMessage(`PM successfully sent to ${user}`);

            userNameRef[user].emit('message', privateMessage);
            socket.emit('message', successMessage);
          } else {
            const failureMessage = convertToServerMessage('PM not sent- user not found');

            socket.emit('message', failureMessage);
          }

          break;
        }

        default: {
          break;
        }
      }
    });

    socket.on('disconnect', () => {
      delete users[socket.id];
    });
  });
};

module.exports = {
  init,
};
