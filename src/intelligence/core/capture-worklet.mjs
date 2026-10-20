class Capture extends AudioWorkletProcessor{
 constructor(){super();this.buffer=new Float32Array(2048);this.index=0;}
 process(inputs){const data=inputs[0]?.[0];if(data)for(const sample of data){this.buffer[this.index++]=sample;if(this.index===this.buffer.length){this.port.postMessage(this.buffer,[this.buffer.buffer]);this.buffer=new Float32Array(2048);this.index=0;}}return true;}
}
registerProcessor('core-microphone',Capture);
