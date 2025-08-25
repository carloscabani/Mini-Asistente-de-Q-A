import React from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadedFile } from '../types';

interface UploaderProps {
  onUpload: (files: File[]) => void;
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const Uploader: React.FC<UploaderProps> = ({ onUpload, uploadedFiles, isUploading }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] },
  });

  return (
    <section className="uploader-section">
      <h2>Cargar Documentos</h2>
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        {isUploading ? <p>Cargando...</p> : <p>Arrastra archivos o haz clic para seleccionar.</p>}
      </div>
      {uploadedFiles.length > 0 && (
        <div className="files-list">
          <h3>Archivos indexados:</h3>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="file-item">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatFileSize(file.size)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};