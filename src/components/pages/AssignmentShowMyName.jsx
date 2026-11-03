
import { useState } from "react";

// Component 1: InputBox
function InputBox({ text, setText }) {
  return (
    <div>
      <h3>Input Box</h3>

      <input
        type="text"
        placeholder="Enter your name"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
}

// Component 2: TextViewer
function TextViewer({ text }) {
  return (
    <div>
      <h3>Text Viewer</h3>
      <p>{text || "Your typed text will appear here."}</p>
    </div>
  );
}

// Parent Component
function AssignmentShowMyName() {
  const [text, setText] = useState("");

  return (
    <div>
      <h1>Assignment II - Show My Name</h1>

      <InputBox text={text} setText={setText} />

      <TextViewer text={text} />
    </div>
  );
}

export default AssignmentShowMyName;
