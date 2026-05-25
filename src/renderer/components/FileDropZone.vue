<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

defineProps<{
  active: boolean
}>()

const emit = defineEmits<{
  filesDropped: [files: string[]]
}>()

const isOver = ref(false)
let dragCounter = 0

function onDragEnter(e: DragEvent) {
  e.preventDefault()
  dragCounter++
  if (e.dataTransfer?.types.includes('Files')) {
    isOver.value = true
  }
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  dragCounter--
  if (dragCounter <= 0) {
    isOver.value = false
    dragCounter = 0
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isOver.value = false
  dragCounter = 0

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  const paths: string[] = []
  for (let i = 0; i < files.length; i++) {
    // Electron 中 file.path 是本地绝对路径
    const fp = (files[i] as any).path as string
    if (fp) paths.push(fp)
  }

  if (paths.length > 0) {
    emit('filesDropped', paths)
  }
}

onMounted(() => {
  document.addEventListener('dragenter', onDragEnter)
  document.addEventListener('dragleave', onDragLeave)
  document.addEventListener('dragover', onDragOver)
  document.addEventListener('drop', onDrop)
})

onUnmounted(() => {
  document.removeEventListener('dragenter', onDragEnter)
  document.removeEventListener('dragleave', onDragLeave)
  document.removeEventListener('dragover', onDragOver)
  document.removeEventListener('drop', onDrop)
})
</script>

<template>
  <Transition name="drop-fade">
    <div v-if="isOver" class="drop-overlay">
      <div class="drop-icon">📂</div>
      <div class="drop-text">松开以分析文件</div>
    </div>
  </Transition>
</template>

<style scoped>
.drop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(108, 92, 231, 0.12);
  backdrop-filter: blur(3px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 100;
  border: 3px dashed var(--pet-accent);
  border-radius: var(--pet-radius);
  pointer-events: none;
}

.drop-icon {
  font-size: 42px;
  animation: drop-bounce 0.5s ease-in-out infinite alternate;
}

.drop-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--pet-accent);
}

@keyframes drop-bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-6px); }
}

.drop-fade-enter-active { animation: fade-in 0.15s ease-out; }
.drop-fade-leave-active { animation: fade-in 0.1s ease-in reverse; }

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
