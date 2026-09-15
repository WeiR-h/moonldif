import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class Boundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="fatal"><h1>工作台发生错误</h1><p>未生成新的导出文件。请重新加载页面，或使用项目 CLI 检查文件。</p><button onClick={() => location.reload()}>重新加载</button></main> : this.props.children; }
}
createRoot(document.getElementById('root')).render(<React.StrictMode><Boundary><App /></Boundary></React.StrictMode>);
