<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  character: 'yier' | 'bubu'
  petState: string
}>()

const emit = defineEmits<{
  close: []
}>()

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

const messages = ref<Message[]>([])
const inputText = ref('')
const isThinking = ref(false)
const chatBody = ref<HTMLElement | null>(null)

// 收集器：用于收集 claude stream-json 输出
let streamContent = ''
let currentStreamMsgId = ''

function scrollToBottom() {
  nextTick(() => {
    if (chatBody.value) {
      chatBody.value.scrollTop = chatBody.value.scrollHeight
    }
  })
}

function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isThinking.value) return

  messages.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    content: text,
    timestamp: Date.now(),
  })

  window.petAPI?.sendMessage(text)
  inputText.value = ''
  scrollToBottom()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    sendMessage()
  }
}

// 简易 markdown → HTML
function renderMd(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
      return `<pre class="code-block"><code class="lang-${lang}">${code.trim()}</code></pre>`
    })
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\n/g, '<br>')
}

// 事件清理函数数组
const cleanups: (() => void)[] = []

onMounted(() => {
  if (!window.petAPI) return

  cleanups.push(
    window.petAPI.onClaudeThinking(() => {
      isThinking.value = true
      streamContent = ''
      currentStreamMsgId = `ai-${Date.now()}`
      messages.value.push({
        id: currentStreamMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      })
      scrollToBottom()
    })
  )

  cleanups.push(
    window.petAPI.onClaudeStream((data: any) => {
      // Claude stream-json 输出格式
      if (data.type === 'content_block_delta') {
        const text = data.delta?.text || ''
        streamContent += text
        updateStreamMessage(streamContent)
      } else if (data.type === 'result') {
        // 最终结果消息
        if (data.result) {
          updateStreamMessage(data.result)
        }
      } else if (data.type === 'raw') {
        streamContent += data.text
        updateStreamMessage(streamContent)
      }
    })
  )

  cleanups.push(
    window.petAPI.onClaudeDone(() => {
      isThinking.value = false
      // 保存会话
      window.petAPI?.saveSession(`session-${Date.now()}`, messages.value)
      scrollToBottom()
    })
  )

  cleanups.push(
    window.petAPI.onClaudeError((msg: string) => {
      isThinking.value = false
      messages.value.push({
        id: `err-${Date.now()}`,
        role: 'system',
        content: `⚠️ ${msg}`,
        timestamp: Date.now(),
      })
      scrollToBottom()
    })
  )
})

onUnmounted(() => {
  cleanups.forEach((fn) => fn())
})

function updateStreamMessage(content: string) {
  const msg = messages.value.find((m) => m.id === currentStreamMsgId)
  if (msg) {
    msg.content = content
  }
  scrollToBottom()
}
</script>

<template>
  <div class="chat-panel" :class="`theme-${character}`">
    <!-- Header -->
    <div class="chat-header">
      <div class="header-left">
        <span class="dot" :class="character"></span>
        <span class="title">{{ character === 'yier' ? '一二' : '布布' }} · AI 助手</span>
      </div>
      <button class="close-btn" @click="emit('close')" title="关闭">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- Messages -->
    <div class="chat-body" ref="chatBody">
      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-icon">{{ character === 'yier' ? '🤍' : '💗' }}</div>
        <div class="empty-text">
          你好呀！我是{{ character === 'yier' ? '一二' : '布布' }}~
          <br>有什么可以帮你的？
        </div>
        <div class="empty-hint">Ctrl+Enter 发送 · 拖文件到窗口自动分析</div>
      </div>

      <div v-for="msg in messages" :key="msg.id" class="message" :class="`msg-${msg.role}`">
        <div v-if="msg.role === 'user'" class="bubble user-bubble">{{ msg.content }}</div>
        <div v-else-if="msg.role === 'assistant'" class="bubble ai-bubble" v-html="renderMd(msg.content)"></div>
        <div v-else class="msg-system">{{ msg.content }}</div>
      </div>

      <div v-if="isThinking && !streamContent" class="thinking-dots">
        <span></span><span></span><span></span>
      </div>
    </div>

    <!-- Input -->
    <div class="chat-input">
      <textarea
        v-model="inputText"
        @keydown="onKeydown"
        placeholder="输入问题… (Ctrl+Enter 发送)"
        rows="2"
        :disabled="isThinking"
      ></textarea>
      <div class="input-actions">
        <button v-if="isThinking" class="btn stop-btn" @click="window.petAPI?.stopClaude()">停止</button>
        <button v-else class="btn send-btn" :disabled="!inputText.trim()" @click="sendMessage">发送</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  width: 320px;
  height: 380px;
  display: flex;
  flex-direction: column;
  background: var(--pet-glass);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  border: 1px solid var(--pet-glass-border);
  border-radius: var(--pet-radius);
  box-shadow: var(--pet-shadow);
  overflow: hidden;
  position: absolute;
  bottom: 165px;
  left: 50%;
  transform: translateX(-50%);
}

/* --- Header --- */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.25);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.dot.yier { background: #DDD; }
.dot.bubu { background: #FF6B9D; }

.title {
  font-size: 13px;
  font-weight: 600;
  color: var(--pet-text);
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: var(--pet-text-light);
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-btn:hover {
  background: rgba(0,0,0,0.06);
  color: var(--pet-text);
}

/* --- Body --- */
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  gap: 8px;
}
.empty-icon {
  font-size: 32px;
  animation: bounce-gentle 2s ease-in-out infinite;
}
.empty-text {
  font-size: 14px;
  color: var(--pet-text);
  line-height: 1.6;
}
.empty-hint {
  font-size: 11px;
  color: var(--pet-text-light);
  margin-top: 8px;
}

@keyframes bounce-gentle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* --- Messages --- */
.message {
  max-width: 88%;
  animation: msg-in 0.25s ease-out;
}
.msg-user { align-self: flex-end; }

.bubble {
  padding: 8px 12px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
}

.user-bubble {
  background: var(--pet-accent);
  color: white;
  border-bottom-right-radius: 4px;
}

.ai-bubble {
  background: rgba(255,255,255,0.85);
  color: var(--pet-text);
  border-bottom-left-radius: 4px;
  border: 1px solid rgba(0,0,0,0.05);
}

.ai-bubble :deep(pre.code-block) {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 8px 10px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 12px;
  margin: 6px 0;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.ai-bubble :deep(code.inline-code) {
  background: rgba(0,0,0,0.06);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
}

.msg-system {
  text-align: center;
  font-size: 12px;
  color: var(--pet-text-light);
  padding: 4px 8px;
}

@keyframes msg-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- Thinking --- */
.thinking-dots {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  align-self: flex-start;
}
.thinking-dots span {
  width: 6px;
  height: 6px;
  background: var(--pet-accent-light);
  border-radius: 50%;
  animation: dot-pulse 1.4s ease-in-out infinite;
}
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-pulse {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

/* --- Input --- */
.chat-input {
  padding: 10px 12px;
  border-top: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.25);
  flex-shrink: 0;
}

.chat-input textarea {
  width: 100%;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: none;
  background: rgba(255,255,255,0.6);
  color: var(--pet-text);
  outline: none;
  transition: border-color 0.2s;
}
.chat-input textarea:focus {
  border-color: var(--pet-accent);
}
.chat-input textarea::placeholder {
  color: var(--pet-text-light);
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}

.btn {
  border: none;
  padding: 5px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.send-btn {
  background: var(--pet-accent);
  color: white;
}
.send-btn:hover { background: #5B4BD5; }
.send-btn:disabled { opacity: 0.4; cursor: default; }

.stop-btn {
  background: #FF6B6B;
  color: white;
}
.stop-btn:hover { background: #E05555; }
</style>
