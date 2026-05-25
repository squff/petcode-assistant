<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  character: 'yier' | 'bubu'
  state: 'idle' | 'thinking' | 'talking' | 'happy' | 'alert'
}>()

const emit = defineEmits<{
  click: []
  contextMenu: [e: MouseEvent]
}>()

// --- 状态 ---
const isBlinking = ref(false)
const showAlertBubble = ref(false)
let blinkTimer: ReturnType<typeof setTimeout> | null = null
let alertTimer: ReturnType<typeof setTimeout> | null = null

// --- 眨眼 ---
function startBlinking() {
  stopBlinking()
  const tick = () => {
    isBlinking.value = true
    setTimeout(() => { isBlinking.value = false }, 150)
    blinkTimer = setTimeout(tick, 2500 + Math.random() * 3000)
  }
  blinkTimer = setTimeout(tick, 1500)
}
function stopBlinking() {
  if (blinkTimer) { clearTimeout(blinkTimer); blinkTimer = null }
}

// --- 闲置提醒 (布布) ---
function resetAlert() {
  showAlertBubble.value = false
  if (alertTimer) clearTimeout(alertTimer)
  if (props.character === 'bubu') {
    alertTimer = setTimeout(() => { showAlertBubble.value = true }, 45000)
  }
}

// --- 拖拽窗口 ---
let isDragging = false
let lastX = 0
let lastY = 0
let moveDistance = 0
const DRAG_THRESHOLD = 3

function onMouseDown(e: MouseEvent) {
  isDragging = false
  moveDistance = 0
  lastX = e.screenX
  lastY = e.screenY

  const onMove = (me: MouseEvent) => {
    const dx = me.screenX - lastX
    const dy = me.screenY - lastY
    moveDistance += Math.abs(dx) + Math.abs(dy)
    if (moveDistance > DRAG_THRESHOLD) {
      isDragging = true
    }
    lastX = me.screenX
    lastY = me.screenY
    window.petAPI?.dragWindow(dx, dy)
  }

  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    if (!isDragging) {
      emit('click')
      resetAlert()
    }
    isDragging = false
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

onMounted(() => {
  startBlinking()
  resetAlert()
})

onUnmounted(() => {
  stopBlinking()
  if (alertTimer) clearTimeout(alertTimer)
})

watch(() => props.character, () => {
  resetAlert()
})
</script>

<template>
  <div
    class="pet-wrapper"
    :class="[`pet-${character}`, `state-${state}`]"
    @mousedown="onMouseDown"
    @contextmenu="(e: MouseEvent) => emit('contextMenu', e)"
  >
    <!-- 气泡 -->
    <Transition name="bubble-pop">
      <div v-if="state === 'thinking'" class="bubble thinking-bubble">
        <span class="dot-anim"><i></i><i></i><i></i></span>
      </div>
    </Transition>
    <Transition name="bubble-pop">
      <div v-if="showAlertBubble" class="bubble alert-bubble">嘿，还在吗？✨</div>
    </Transition>

    <!-- 角色 -->
    <div class="character-body">
      <!-- ========== 一二：黑白熊猫小熊 ========== -->
      <template v-if="character === 'yier'">
        <div class="yier" :class="{ blinking: isBlinking, thinking: state === 'thinking', talking: state === 'talking' }">
          <!-- 耳朵 (黑色圆形) -->
          <div class="ear ear-l"></div>
          <div class="ear ear-r"></div>
          <!-- 头 -->
          <div class="head">
            <!-- 眼睛 -->
            <div class="eyes">
              <div class="eye" :class="{ closed: isBlinking }"><div class="highlight"></div></div>
              <div class="eye" :class="{ closed: isBlinking }"><div class="highlight"></div></div>
            </div>
            <!-- 腮红 -->
            <div class="blush bl"></div>
            <div class="blush br"></div>
            <!-- 嘴巴 (W形) -->
            <div class="mouth"></div>
          </div>
          <!-- 身体 -->
          <div class="body">
            <!-- 手臂 (黑色末端) -->
            <div class="arm arm-l"></div>
            <div class="arm arm-r"></div>
            <!-- 肚子 -->
            <div class="belly"></div>
          </div>
          <!-- 脚 (黑色) -->
          <div class="foot foot-l"></div>
          <div class="foot foot-r"></div>
        </div>
      </template>

      <!-- ========== 布布：浅棕色小狗 ========== -->
      <template v-if="character === 'bubu'">
        <div class="bubu" :class="{ blinking: isBlinking, thinking: state === 'thinking', happy: state === 'happy', talking: state === 'talking' }">
          <!-- 耳朵 (下垂) -->
          <div class="ear ear-l"></div>
          <div class="ear ear-r"></div>
          <!-- 头 -->
          <div class="head">
            <!-- 眼睛 -->
            <div class="eyes">
              <div class="eye" :class="{ closed: isBlinking }"><div class="highlight"></div></div>
              <div class="eye" :class="{ closed: isBlinking }"><div class="highlight"></div></div>
            </div>
            <!-- 腮红 -->
            <div class="blush bl"></div>
            <div class="blush br"></div>
            <!-- 鼻子 -->
            <div class="nose"></div>
            <!-- 嘴巴 (W形) -->
            <div class="mouth"></div>
          </div>
          <!-- 身体 -->
          <div class="body">
            <!-- 手臂 -->
            <div class="arm arm-l"></div>
            <div class="arm arm-r"></div>
            <!-- 肚子 -->
            <div class="belly"></div>
          </div>
          <!-- 脚 -->
          <div class="foot foot-l"></div>
          <div class="foot foot-r"></div>
          <!-- 尾巴 -->
          <div class="tail"></div>
        </div>
      </template>
    </div>

    <!-- 地面阴影 -->
    <div class="ground-shadow" :class="{ bouncing: character === 'bubu' }"></div>
  </div>
</template>

<style scoped>
.pet-wrapper {
  position: relative;
  width: 130px;
  height: 160px;
  cursor: pointer;
  transition: transform 0.15s var(--pet-transition);
}
.pet-wrapper:active { transform: scale(0.96); }

.character-body { position: relative; width: 100%; height: 100%; }

/* ===== 气泡 ===== */
.bubble {
  position: absolute;
  top: -38px;
  left: 50%;
  transform: translateX(-50%);
  padding: 5px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 10;
  box-shadow: 0 3px 10px rgba(0,0,0,0.08);
}
.thinking-bubble { background: rgba(255,255,255,0.95); color: #6C5CE7; }
.alert-bubble { background: rgba(255,255,255,0.95); color: #FD79A8; animation: float-gentle 2s ease-in-out infinite; }

.dot-anim i {
  display: inline-block;
  width: 5px; height: 5px;
  background: #6C5CE7;
  border-radius: 50%;
  margin: 0 1px;
  animation: dot-bounce 1.4s ease-in-out infinite;
}
.dot-anim i:nth-child(2) { animation-delay: 0.2s; }
.dot-anim i:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
@keyframes float-gentle { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-3px)} }

.bubble-pop-enter-active { animation: pop-in 0.25s ease-out; }
.bubble-pop-leave-active { animation: pop-in 0.15s ease-in reverse; }
@keyframes pop-in { from{opacity:0;transform:translateX(-50%) scale(0.6)} to{opacity:1;transform:translateX(-50%) scale(1)} }

/* ===== 地面阴影 ===== */
.ground-shadow {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 8px;
  background: radial-gradient(ellipse, rgba(0,0,0,0.12) 0%, transparent 70%);
  border-radius: 50%;
}
.ground-shadow.bouncing { animation: shadow-pulse 1.5s ease-in-out infinite; }
@keyframes shadow-pulse { 0%,100%{width:60px;opacity:0.8} 50%{width:44px;opacity:0.5} }

/* ==================== 一二：黑白熊猫小熊 ==================== */
.yier { animation: yier-breathe 3s ease-in-out infinite; position: relative; }
.yier.thinking { animation: yier-think 0.8s ease-in-out infinite; }

/* 耳朵 */
.yier .ear {
  position: absolute;
  width: 26px; height: 26px;
  background: #2D2D2D;
  border-radius: 50%;
  top: 8px;
  z-index: 0;
}
.yier .ear-l { left: 16px; }
.yier .ear-r { right: 16px; }
.yier .ear::after {
  content: '';
  position: absolute;
  width: 12px; height: 12px;
  background: #4A4A4A;
  border-radius: 50%;
  top: 5px; left: 50%;
  transform: translateX(-50%);
}

/* 头 */
.yier .head {
  position: absolute;
  width: 80px; height: 72px;
  background: #F8F8F8;
  border-radius: 40px 40px 36px 36px;
  top: 22px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  box-shadow: inset 0 -3px 6px rgba(0,0,0,0.04);
}

/* 眼睛 */
.yier .eyes {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 18px;
}
.yier .eye {
  width: 12px; height: 14px;
  background: #1A1A1A;
  border-radius: 50%;
  position: relative;
  transition: all 0.1s;
}
.yier .eye.closed { height: 3px; border-radius: 2px; margin-top: 6px; }
.yier .highlight {
  position: absolute;
  width: 4px; height: 4px;
  background: white;
  border-radius: 50%;
  top: 2px; left: 2px;
}

/* 腮红 */
.yier .blush {
  position: absolute;
  width: 14px; height: 8px;
  background: rgba(255,180,190,0.4);
  border-radius: 50%;
  top: 40px;
}
.yier .bl { left: 6px; }
.yier .br { right: 6px; }

/* 嘴巴 (W形) */
.yier .mouth {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px; height: 6px;
}
.yier .mouth::before, .yier .mouth::after {
  content: '';
  position: absolute;
  width: 8px; height: 5px;
  border-bottom: 2px solid #CCC;
  border-radius: 0 0 50% 50%;
}
.yier .mouth::before { left: 0; }
.yier .mouth::after { right: 0; }

/* 身体 */
.yier .body {
  position: absolute;
  width: 60px; height: 40px;
  background: #F8F8F8;
  border-radius: 30px 30px 24px 24px;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
}

/* 肚子 */
.yier .belly {
  position: absolute;
  width: 36px; height: 24px;
  background: #FFF;
  border-radius: 50%;
  top: 94px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

/* 手臂 */
.yier .arm {
  position: absolute;
  width: 16px; height: 28px;
  background: #F8F8F8;
  border-radius: 8px;
  top: 88px;
  z-index: 0;
}
.yier .arm::after {
  content: '';
  position: absolute;
  width: 16px; height: 10px;
  background: #2D2D2D;
  border-radius: 8px;
  bottom: 0;
}
.yier .arm-l { left: 8px; transform: rotate(8deg); }
.yier .arm-r { right: 8px; transform: rotate(-8deg); }

/* 脚 */
.yier .foot {
  position: absolute;
  width: 22px; height: 14px;
  background: #2D2D2D;
  border-radius: 11px 11px 8px 8px;
  bottom: 4px;
  z-index: 1;
}
.yier .foot-l { left: 30px; }
.yier .foot-r { right: 30px; }

@keyframes yier-breathe { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
@keyframes yier-think { 0%,100%{transform:translateY(0) rotate(0)} 25%{transform:translateY(-2px) rotate(-2deg)} 75%{transform:translateY(-2px) rotate(2deg)} }
/* 一二 talking 嘴巴动画 */
.yier.talking .mouth::before,
.yier.talking .mouth::after {
  animation: mouth-move 0.25s ease-in-out infinite alternate;
}

/* ==================== 布布：浅棕色小狗 ==================== */
.bubu { animation: bubu-float 1.5s ease-in-out infinite; position: relative; }
.bubu.thinking { animation: bubu-think 0.6s ease-in-out infinite; }
.bubu.happy { animation: bubu-spin 0.7s ease-in-out; }
.bubu.talking .mouth::before { animation: mouth-move 0.2s ease-in-out infinite alternate; }

/* 耳朵 (下垂) */
.bubu .ear {
  position: absolute;
  width: 22px; height: 32px;
  background: #C4956A;
  border-radius: 50% 50% 40% 40%;
  top: 20px;
  z-index: 0;
  transform-origin: top center;
}
.bubu .ear-l { left: 12px; transform: rotate(-15deg); }
.bubu .ear-r { right: 12px; transform: rotate(15deg); }
.bubu .ear::after {
  content: '';
  position: absolute;
  width: 12px; height: 18px;
  background: #E8C9A8;
  border-radius: 50%;
  top: 8px; left: 50%;
  transform: translateX(-50%);
}

/* 头 */
.bubu .head {
  position: absolute;
  width: 84px; height: 76px;
  background: linear-gradient(135deg, #F0D4A8 0%, #E8C490 100%);
  border-radius: 42px 42px 38px 38px;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  box-shadow: inset 0 -4px 8px rgba(180,140,80,0.1);
}

/* 眼睛 */
.bubu .eyes {
  display: flex;
  justify-content: center;
  gap: 22px;
  margin-top: 20px;
}
.bubu .eye {
  width: 12px; height: 14px;
  background: #1A1A1A;
  border-radius: 50%;
  position: relative;
  transition: all 0.1s;
}
.bubu .eye.closed { height: 3px; border-radius: 2px; margin-top: 6px; }
.bubu .highlight {
  position: absolute;
  width: 4px; height: 4px;
  background: white;
  border-radius: 50%;
  top: 2px; left: 2px;
}

/* 腮红 */
.bubu .blush {
  position: absolute;
  width: 14px; height: 8px;
  background: rgba(255,140,100,0.3);
  border-radius: 50%;
  top: 42px;
}
.bubu .bl { left: 6px; }
.bubu .br { right: 6px; }

/* 鼻子 */
.bubu .nose {
  position: absolute;
  width: 10px; height: 7px;
  background: #3D2B1F;
  border-radius: 50% 50% 40% 40%;
  top: 38px;
  left: 50%;
  transform: translateX(-50%);
}

/* 嘴巴 (W形) */
.bubu .mouth {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 18px; height: 6px;
}
.bubu .mouth::before, .bubu .mouth::after {
  content: '';
  position: absolute;
  width: 9px; height: 5px;
  border-bottom: 2px solid #B89070;
  border-radius: 0 0 50% 50%;
}
.bubu .mouth::before { left: 0; }
.bubu .mouth::after { right: 0; }

/* 身体 */
.bubu .body {
  position: absolute;
  width: 62px; height: 42px;
  background: linear-gradient(180deg, #F0D4A8 0%, #E8C490 100%);
  border-radius: 31px 31px 24px 24px;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
}

/* 肚子 */
.bubu .belly {
  position: absolute;
  width: 38px; height: 26px;
  background: #FFF5E6;
  border-radius: 50%;
  top: 94px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

/* 手臂 */
.bubu .arm {
  position: absolute;
  width: 16px; height: 26px;
  background: #E8C490;
  border-radius: 8px;
  top: 90px;
  z-index: 0;
}
.bubu .arm-l { left: 8px; transform: rotate(10deg); animation: wave-l 2s ease-in-out infinite; }
.bubu .arm-r { right: 8px; transform: rotate(-10deg); animation: wave-r 2s ease-in-out infinite; }

/* 脚 */
.bubu .foot {
  position: absolute;
  width: 22px; height: 14px;
  background: #D4A870;
  border-radius: 11px 11px 8px 8px;
  bottom: 4px;
  z-index: 1;
}
.bubu .foot-l { left: 30px; }
.bubu .foot-r { right: 30px; }

/* 尾巴 */
.bubu .tail {
  position: absolute;
  width: 16px; height: 20px;
  background: #E8C490;
  border-radius: 50%;
  top: 100px;
  right: 14px;
  z-index: 0;
  animation: tail-wag 0.8s ease-in-out infinite alternate;
  transform-origin: bottom center;
}

@keyframes bubu-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes bubu-think { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-3px) rotate(2deg)} }
@keyframes bubu-spin { 0%{transform:rotate(0) scale(1)} 50%{transform:rotate(180deg) scale(1.06)} 100%{transform:rotate(360deg) scale(1)} }
@keyframes wave-l { 0%,100%{transform:rotate(10deg)} 50%{transform:rotate(18deg)} }
@keyframes wave-r { 0%,100%{transform:rotate(-10deg)} 50%{transform:rotate(-18deg)} }
@keyframes tail-wag { from{transform:rotate(-15deg)} to{transform:rotate(15deg)} }
@keyframes mouth-move { from{transform:scaleY(1)} to{transform:scaleY(0.5)} }
</style>
