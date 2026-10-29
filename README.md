# 半周年倒计时

点index.html即可打开



说明

| 内容           | 位置                                                      |
| ------------ | ------------------------------------------------------- |
| 目标时间         | `app.js` 顶部 `TARGET`（默认 `2026-11-01T12:00:00+08:00`）    |
| 渐入音量 / 时长    | `app.js` 中 `TARGET_VOLUME`、`FADE_DURATION`、`FADE_DELAY` |
| 主色 / 字体 / 间距 | `styles.css` 顶部 `:root` 变量                              |
| 视频、音频        | `assets/bg-video.mp4`、`assets/bgm.mp3`                  |

```
index.html          页面结构（含独立进入层）
styles.css          视觉与响应式样式
app.js              倒计时、进入层与音画同步、视差
assets/bg-video.mp4 背景视频（进入后循环、静音）
assets/bgm.mp3      背景音乐
preview.png         主界面效果预览
```
