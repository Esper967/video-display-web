/*
 * 可拓展前端框架 · 项目配置
 * ------------------------------------------------------------
 * 纯音画页面：只负责进入提示、音乐渐入和错误提示。
 * 素材地址由启动器扫描后写入 assets/manifest.js。
 */
window.FRAME_CONFIG = {
  // 进入提示
  enterText: "点击进入",

  // 音乐渐入：目标音量、渐入时长（毫秒）、点击后延迟（毫秒）
  targetVolume: 0.45,
  fadeDuration: 3000,
  fadeDelay: 120,

  // 素材缺失或无法播放时的提示
  mediaErrorTitle: "素材未就绪",
  mediaErrorText: "请把 1 个视频和 1 个音频放入 assets 文件夹，然后双击“启动网页.bat”。"
};
