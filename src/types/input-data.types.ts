export interface InputData {
  number: string;
  message: string;
  nome: string;
  chaveRedis: string;
}

export interface AudioData extends InputData {
  transcribedText: string;
}

export interface TextData extends InputData {
  originalText: string;
}

export interface ProcessedInputData extends InputData {
  messageType: 'audio' | 'text';
  originalData: AudioData | TextData;
}
