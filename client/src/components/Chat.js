import React, { useState, useEffect } from "react";
import queryString from "query-string";
import io from "socket.io-client";

import Messages from "./Messages";
import InfoBar from "./InfoBar";
import Input from "./Input";

let socket;

const Chat = ({ location }) => {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [users, setUsers] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const ENDPOINT = "https://boardserver.herokuapp.com";

  useEffect(() => {
    const { name, room } = queryString.parse(location.search);

    socket = io(ENDPOINT);

    setRoom(room);
    setName(name);

    socket.emit("join", { name, room }, error => {
      if (error) {
        alert(error);
      }
    });
  }, [ENDPOINT, location.search]);

  useEffect(() => {
    socket.on("message", message => {
      setMessages([...messages, message]);
    });

    socket.on("roomData", ({ users, chat }) => {
      console.log(users);
      setUsers(users);
      console.log(chat);
      if(chat) {
        setMessages([...messages, ...chat]);
      }
      console.log(messages);
    });

    return () => {
      socket.emit("disconnect");

      socket.off();
    };
  }, [message, messages]);

  const sendMessage = event => {
    event.preventDefault();

    if (message) {
      socket.emit("sendMessage", message, () => setMessage(""));
    }
  };

  return (
    <div className="chat border border-light">
      <div className="px-4 py-5 chat-box">
        <div className="chat-window">
          <InfoBar room={room} />
          <div className="scroll">
            <Messages messages={messages} name={name} />
          </div>
          <Input
            message={message}
            setMessage={setMessage}
            sendMessage={sendMessage}
          />
        </div>
      </div>
    </div>

  );
};

export default Chat;
