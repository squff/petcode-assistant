<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import PetCharacter from './components/PetCharacter.vue'
import ChatPanel from './components/ChatPanel.vue'
import FileDropZone from './components/FileDropZone.vue'

const currentCharacter = ref<'yier' | 'bubu'>('yier')
const showChat = ref(false)
const petState = ref<'idle' | 'thinking' | 'talking' | 'happy' | 'alert'>('idle')
const isDragging = ref(false)

function toggleChat() {
  showChat.value = !showChat.value
}

function onFilesDropped(files: string[]) {
  if (window.petAPI) {
    window.petAPI.sendMessage('请分析这些文件', files)
  }
  showChat.value = true
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
}

function onCharacterSwitch(name: string) {
  currentCharacter.value = name as 'yier' | 'bubu'
}

onMounted(() => {
  if (window.petAPI) {
    window.petAPI.onSwitchCharacter(onCharacterSwitch)
    window.petAPI.onShowChat(() => { showChat.value = true })
    window.petAPI.onClaudeThinking(() => { petState.value = 'thinking' })
    window.petAPI.onClaudeDone(() => { petState.value = 'idle' })
    window.petAPI.onClaudeError(() => { petState.value = 'idle' })
  }
})
</script>

<template>
  <div class="pet-container" :class="{ 'chat-open': showChat }">
    <FileDropZone
      :active="isDragging"
      @files-dropped="onFilesDropped"
    />

    <Transition name="chat-slide">
      <ChatPanel
        v-if="showChat"
        :character="currentCharacter"
        :pet-state="petState"
        @close="showChat = false"
      />
    </Transition>

    <PetCharacter
      :character="currentCharacter"
      :state="petState"
      @click="toggleChat"
      @context-menu="onContextMenu"
    />
  </div>
</template>

<style>
:root {
  --pet-bg: rgba(255, 255, 255, 0.85);
  --pet-accent: #6C5CE7;
  --pet-accent-light: #A29BFE;
  --pet-pink: #FD79A8;
  --pet-blue: #74B9FF;
  --pet-text: #2D3436;
  --pet-text-light: #636E72;
  --pet-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  --pet-glass: rgba(255, 255, 255, 0.72);
  --pet-glass-border: rgba(255, 255, 255, 0.35);
  --pet-radius: 20px;
  --pet-transition: cubic-bezier(0.4, 0, 0.2, 1);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body, #app {
  width: 100%;
  height: 100%;
  background: transparent;
  overflow: hidden;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.pet-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  background: transparent;
}

.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.35s var(--pet-transition);
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}

/* 滚动条 */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
</style>
