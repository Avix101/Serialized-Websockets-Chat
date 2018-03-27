const users = {};
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

const convertToChatMessage = (user, message) => {
  const code = 1;
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

          console.log(length);

          for (let i = 0; i < length; i++) {
            userMessage += `${String.fromCharCode(buffer.readInt8(i + 3))}`;
          }

          console.log('decoded');

          const chatRoomMessage = convertToChatMessage(
            socket.name,
            userMessage,
          );

          console.log('sent');
          io.sockets.in(room).emit('message', chatRoomMessage);
          break;
        }

        default: {
          break;
        }
      }
    });
  });
};

module.exports = {
  init,
};
