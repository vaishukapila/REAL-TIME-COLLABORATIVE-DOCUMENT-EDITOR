const socket = io();
const editor = new Quill('#editor-container', {
  theme: 'snow',
  modules: {
    toolbar: [['bold', 'italic', 'underline'], [{ 'header': [1, 2, false] }]]
  }
});

const username = prompt("Enter your name:");
socket.emit("new-user", username);

const documentId = "sample-doc";
socket.emit("get-document", documentId);

socket.on("load-document", (content) => {
  editor.setContents(content);
});

editor.on("text-change", (delta, oldDelta, source) => {
  if (source !== 'user') return;
  socket.emit("send-changes", delta);
});

socket.on("receive-changes", (delta) => {
  editor.updateContents(delta);
});

setInterval(() => {
  socket.emit("save-document", editor.getContents());
}, 2000);

socket.on("user-joined", (name) => {
  alert(`${name} joined the document.`);
});

socket.on("user-left", (name) => {
  alert(`${name} left the document.`);
});

socket.on("user-count", (count) => {
  document.getElementById("userCount").textContent = `Online Users: ${count}`;
});
