/**
 * Audio Recording and Message Service
 * Handles recording audio messages and sending them as media attachments
 */

export interface AudioRecording {
  blob: Blob;
  duration: number;
  mimeType: string;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: BlobPart[] = [];
  private startTime: number = 0;
  private stream: MediaStream | null = null;

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = this.getSupportedMimeType();
      
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.audioChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      console.log('[AudioRecorder] Recording started');
    } catch (error) {
      console.error('[AudioRecorder] Failed to start recording:', error);
      throw new Error('Failed to access microphone. Please check permissions.');
    }
  }

  stopRecording(): AudioRecording | null {
    if (!this.mediaRecorder) {
      console.error('[AudioRecorder] No active recording');
      return null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const duration = Date.now() - this.startTime;
        const mimeType = this.getSupportedMimeType();
        const blob = new Blob(this.audioChunks, { type: mimeType });

        // Stop all tracks to release microphone
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }

        console.log('[AudioRecorder] Recording stopped, duration:', duration, 'ms, size:', blob.size);

        resolve({
          blob,
          duration,
          mimeType
        });
      };

      this.mediaRecorder.stop();
    });
  }

  getDuration(): number {
    if (!this.mediaRecorder || this.startTime === 0) return 0;
    return Math.round((Date.now() - this.startTime) / 1000);
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }

  async uploadAudio(
    audio: AudioRecording,
    chatId: string,
    userId: string
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', audio.blob, `audio-${Date.now()}.webm`);
    formData.append('type', 'audio');
    formData.append('duration', String(audio.duration));

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userId}`  // userId is not a token!
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload audio');
    }

    const data = await response.json();
    return data.url;
  }
}

export const createAudioRecorder = () => new AudioRecorder();

/**
 * Format duration in seconds to mm:ss format
 */
export const formatAudioDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
