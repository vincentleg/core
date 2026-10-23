// Module worker: on-device WebLLM inference off the main thread, so the Earth keeps rendering while the model runs.
import {WebWorkerMLCEngineHandler} from '../../../assets/vendor/web-llm-0.2.85/web-llm.mjs';
const handler=new WebWorkerMLCEngineHandler();self.onmessage=m=>handler.onmessage(m);
