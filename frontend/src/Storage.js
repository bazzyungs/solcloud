import React, { useState, useEffect } from 'react';

const Storage = () => {
  const [files, setFiles] = useState([]); // 파일 목록
  const [selectedFile, setSelectedFile] = useState(null); // 업로드할 파일
  const [uploadMessage, setUploadMessage] = useState('');

  // 서버에서 파일 목록 가져오기
  const fetchFiles = async () => {
    try {
      const response = await fetch('api/files');
      const data = await response.json();
      if (response.ok) {
        setFiles(data);
      } else {
        console.error('파일 목록을 가져오는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('서버와의 연결에 실패했습니다.', error);
    }
  };

  // 파일 업로드 핸들러
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage('업로드할 파일을 선택해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadMessage('파일 업로드 성공!');
        setSelectedFile(null);
        fetchFiles(); // 업로드 후 파일 목록 갱신
      } else {
        setUploadMessage(data.message || '파일 업로드 실패.');
      }
    } catch (error) {
      setUploadMessage('서버와의 연결에 실패했습니다.');
    }
  };

  // 파일 삭제 핸들러
  const handleDelete = async (fileName) => {
    try {
      const response = await fetch(`api/files/${fileName}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFiles(files.filter((file) => file !== fileName)); // 로컬 파일 목록 업데이트
      } else {
        console.error('파일 삭제 실패.');
      }
    } catch (error) {
      console.error('서버와의 연결에 실패했습니다.', error);
    }
  };

  // 컴포넌트가 마운트될 때 파일 목록 가져오기
  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="storage-container">
      <h2>스토리지</h2>
      <div className="upload-section">
        <h3>파일 업로드</h3>
        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files[0])}
        />
        <button onClick={handleUpload}>업로드</button>
        {uploadMessage && <p>{uploadMessage}</p>}
      </div>

      <div className="file-list">
        <h3>파일 목록</h3>
        {files.length > 0 ? (
          <ul>
            {files.map((file, index) => (
              <li key={index}>
                {file}{' '}
                <button onClick={() => handleDelete(file)}>삭제</button>
              </li>
            ))}
          </ul>
        ) : (
          <p>저장된 파일이 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default Storage;

