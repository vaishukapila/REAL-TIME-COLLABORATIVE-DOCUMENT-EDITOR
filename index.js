
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static('public'));

let currentContent = {};
let Document = null;
let isMongoConnected = false;

// Try to connect to MongoDB with timeout and fallback
mongoose.connect('mongodb://localhost:27017/collab-editor', {
  serverSelectionTimeoutMS: 5000, // 5 second timeout
}).then(() => {
  console.log('Connected to MongoDB');
  isMongoConnected = true;
  
  const DocumentSchema = new mongoose.Schema({
    _id: String,
    content: Object
  }, {
    timestamps: true
  });
  
  Document = mongoose.model('Document', DocumentSchema);
}).catch((err) => {
  console.log('MongoDB not available, using in-memory storage:', err.message);
  isMongoConnected = false;
});

let users = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  io.emit('user-count', io.engine.clientsCount);

  socket.on('new-user', (name) => {
    users[socket.id] = name;
    socket.broadcast.emit('user-joined', name);
  });

  socket.on('get-document', async (documentId) => {
    let document;
    
    if (isMongoConnected && Document) {
      try {
        document = await Document.findById(documentId);
        if (!document) {
          document = await Document.create({ _id: documentId, content: {} });
        }
      } catch (err) {
        console.log('MongoDB error, using in-memory storage:', err.message);
        document = { content: currentContent[documentId] || {} };
      }
    } else {
      // Use in-memory storage
      document = { content: currentContent[documentId] || {} };
    }
    
    socket.join(documentId);
    socket.emit('load-document', document.content);

    socket.on('send-changes', (delta) => {
      socket.broadcast.to(documentId).emit('receive-changes', delta);
    });

    socket.on('save-document', async (data) => {
      if (isMongoConnected && Document) {
        try {
          await Document.findByIdAndUpdate(documentId, { content: data }, { upsert: true });
        } catch (err) {
          console.log('Error saving to MongoDB:', err.message);
          currentContent[documentId] = data;
        }
      } else {
        // Save to in-memory storage
        currentContent[documentId] = data;
      }
    });
  });

  socket.on('disconnect', () => {
    if (users[socket.id]) {
      socket.broadcast.emit('user-left', users[socket.id]);
      delete users[socket.id];
    }
    io.emit('user-count', io.engine.clientsCount);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
