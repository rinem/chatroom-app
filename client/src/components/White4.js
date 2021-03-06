import React, { Component } from "react";
import io from "socket.io-client";

const socket = io("https://boardserver.herokuapp.com");

export default class WhiteBoard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      style: { backgroundColor: "Blue" },
      id: null,
      drawing: false,
      currentColor: "red",
      stroke: 2,
      windowHeight: window.innerHeight * 0.9,
      windowWidth: window.innerWidth * 0.6,
      cleared: false,
      username: null,
      room: null,
      userList: []
    };

    this.whiteboard = React.createRef();

    // socket.emit("join", {
    //   username: this.props.username,
    //   room: this.props.room
    // });

    // socket.on("join", joined => {
    //   this.setState({
    //     id: joined.id,
    //     username: joined.username,
    //     room: joined.room
    //   });
    // });

    // socket.on("users", users => {
    //   this.setState({
    //     userList: users
    //   });
    // });

    socket.on("cleared", () => {
      this.state.whiteboard
        .getContext("2d")
        .clearRect(0, 0, window.innerWidth, window.innerHeight);
    });

    socket.on("stroke-change", data => {
      console.log("data:-", data);
      this.setState({
        stroke: data.stroke
      });
    });

    socket.on("drawing", data => {
      let w = window.innerWidth;
      let h = window.innerHeight;

      if (!isNaN(data.x0 / w) && !isNaN(data.y0)) {
        this.drawLine(
          data.x0 * w,
          data.y0 * h,
          data.x1 * w,
          data.y1 * h,
          data.color
        );
      }
    });
  }

  componentDidMount() {
    this.setState({
      whiteboard: this.whiteboard.current
    });
    this.whiteboard.current.style.height = window.innerHeight;
    this.whiteboard.current.style.width = window.innerWidth;

    this.whiteboard.current.addEventListener(
      "mousedown",
      this.onMouseDown,
      false
    );
    this.whiteboard.current.addEventListener("mouseup", this.onMouseUp, false);
    this.whiteboard.current.addEventListener("mouseout", this.onMouseUp, false);
    this.whiteboard.current.addEventListener(
      "mousemove",
      this.throttle(this.onMouseMove, 5),
      false
    );

    this.whiteboard.current.addEventListener(
      "touchstart",
      this.onMouseDown,
      false
    );

    this.whiteboard.current.addEventListener(
      "touchmove",
      this.throttle(this.onTouchMove, 5),
      false
    );

    this.whiteboard.current.addEventListener("touchend", this.onMouseUp, false);

    // window.addEventListener("resize", this.onResize);
  }

  drawLine = (x0, y0, x1, y1, color, emit, force) => {
    let context = this.state.whiteboard.getContext("2d");
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = this.state.stroke;
    // if (force) {
    // 	context.lineWidth = 1.75 * (force * (force + 3.75));
    // }
    context.stroke();
    context.closePath();

    if (!emit) {
      return;
    }
    var w = window.innerWidth;
    var h = window.innerHeight;
    this.setState(() => {
      if (!isNaN(x0 / w)) {
        socket.emit("drawing", {
          x0: x0 / w,
          y0: y0 / h,
          x1: x1 / w,
          y1: y1 / h,
          color: color,
          room: this.state.room,
          force: force
        });

        return {
          cleared: false
        };
      }
    });
  };

  onMouseDown = e => {
    this.setState(() => {
      return {
        currentX: e.clientX,
        currentY: e.clientY,
        drawing: true
      };
    });
  };

  onMouseUp = e => {
    this.setState(() => {
      return {
        drawing: false,
        currentX: e.clientX,
        currentY: e.clientY
      };
    });
  };

  onMouseMove = e => {
    if (!this.state.drawing) {
      return;
    }

    this.setState(() => {
      return {
        currentX: e.clientX,
        currentY: e.clientY
      };
    }, this.drawLine(this.state.currentX, this.state.currentY, e.clientX, e.clientY, this.state.currentColor, true));
  };

  onTouchMove = e => {
    if (!this.state.drawing) {
      return;
    }
    console.log();
    this.setState(() => {
      this.drawLine(
        this.state.currentX,
        this.state.currentY,
        e.touches[0].clientX,
        e.touches[0].clientY,
        this.state.currentColor,
        true,
        e.touches[0].force
      );
      return {
        currentX: e.touches[0].clientX,
        currentY: e.touches[0].clientY
      };
    });
  };

  // onResize = () => {
  //   this.setState({
  //     windowWidth: window.innerWidth,
  //     windowHeight: window.innerHeight
  //   });
  // };

  throttle = (callback, delay) => {
    let previousCall = new Date().getTime();
    return function() {
      let time = new Date().getTime();

      if (time - previousCall >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  };

  selectColor = e => {
    const color = e.currentTarget.getAttribute("name");
    this.setState({
      style: { backgroundColor: color }
    });
    this.setState(() => {
      socket.emit("color-change", {
        id: this.state.id,
        username: this.state.username,
        room: this.state.room,
        color: color
      });
      return {
        currentColor: color
      };
    });
  };

  clearBoard = () => {
    this.state.whiteboard.clearRect(
      0,
      0,
      this.state.windowWidth.width,
      this.state.windowHeight
    );
    socket.emit("clear", this.state.room);
  };

  leave = () => {
    socket.emit("leaveroom", { id: this.state.id, room: this.state.room });
  };

  selectSize = e => {
    const stroke = e.currentTarget.getAttribute("size");
    this.setState(() => {
      socket.emit("stroke-change", {
        // id: this.state.id,
        // username: this.state.username,
        // room: this.state.room,
        stroke: stroke
      });
      return {
        stroke: stroke
      };
    });
  };

  render() {
    return (
      <div>
        <canvas
          height={`${this.state.windowHeight}px`}
          width={`${this.state.windowWidth}px`}
          ref={this.whiteboard}
          className="whiteboard"
        />
        <div className="color-bar row">
          <div className="color-pallete col-10">
            <button
              onClick={this.selectColor}
              name="#000000"
              className="color black btn-circle"
            ></button>
            <button
              onClick={this.selectColor}
              name="#f44336"
              className="color red"
            ></button>
            <button
              onClick={this.selectColor}
              name="#36c185"
              className="color green"
            ></button>
            <button
              onClick={this.selectColor}
              name="#2196f3"
              className="color blue"
            ></button>
            <button
              onClick={this.selectColor}
              name="#00bcd4"
              className="color cyan"
            ></button>
            <button
              onClick={this.selectColor}
              name="#ffc400"
              className="color yellow"
            ></button>
            <button
              onClick={this.selectColor}
              name="#ffffff"
              className="color white"
            ></button>
          </div>

          <div className="size-select-bar col-2">
            <button
              onClick={this.selectSize}
              name="#000000"
              size="1"
              className="stroke smallest"
              style={this.state.style}
            ></button>
            <button
              onClick={this.selectSize}
              name="#000000"
              size="2"
              className="stroke smaller"
              style={this.state.style}
            ></button>
            <button
              onClick={this.selectSize}
              name="#000000"
              size="4"
              className="stroke normal"
              style={this.state.style}
            ></button>
            <button
              onClick={this.selectSize}
              name="#000000"
              size="5"
              className="stroke larger"
              style={this.state.style}
            ></button>
            <button
              onClick={this.selectSize}
              name="#000000"
              size="7"
              className="stroke largest"
              style={this.state.style}
            ></button>
          </div>
        </div>
      </div>
    );
  }
}
