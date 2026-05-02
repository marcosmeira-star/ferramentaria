const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('__API_BASE__', 'http://127.0.0.1:8000');
