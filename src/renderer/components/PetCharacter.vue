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

const isBlinking = ref(false)
const showAlertBubble = ref(false)
const isWaving = ref(false)
let blinkTimer: ReturnType<typeof setTimeout> | null = null
let alertTimer: ReturnType<typeof setTimeout> | null = null
let waveTimer: ReturnType<typeof setTimeout> | null = null

function startBlinking() {
  stopBlinking()
  const tick = () => {
    isBlinking.value = true
    setTimeout(() => { isBlinking.value = false }, 150)
    blinkTimer = setTimeout(tick, 2000 + Math.random() * 3000)
  }
  blinkTimer = setTimeout(tick, 1000)
}
function stopBlinking() {
  if (blinkTimer) { clearTimeout(blinkTimer); blinkTimer = null }
}

function startWaving() {
  stopWaving()
  const tick = () => {
    isWaving.value = true
    setTimeout(() => { isWaving.value = false }, 800)
    waveTimer = setTimeout(tick, 8000 + Math.random() * 5000)
  }
  waveTimer = setTimeout(tick, 3000)
}
function stopWaving() {
  if (waveTimer) { clearTimeout(waveTimer); waveTimer = null }
}

function resetAlert() {
  showAlertBubble.value = false
  if (alertTimer) clearTimeout(alertTimer)
  if (props.character === 'bubu') {
    alertTimer = setTimeout(() => { showAlertBubble.value = true }, 45000)
  }
}

let clickTimer: ReturnType<typeof setTimeout> | null = null
let clickCount = 0

function onClick(e: MouseEvent) {
  e.stopPropagation()
  clickCount++

  if (clickCount === 1) {
    clickTimer = setTimeout(() => {
      clickCount = 0
    }, 250)
  } else if (clickCount === 2) {
    if (clickTimer) clearTimeout(clickTimer)
    clickCount = 0
    emit('click')
    resetAlert()
  }
}

onMounted(() => {
  startBlinking()
  startWaving()
  resetAlert()
})

onUnmounted(() => {
  stopBlinking()
  stopWaving()
  if (alertTimer) clearTimeout(alertTimer)
  if (clickTimer) clearTimeout(clickTimer)
})

watch(() => props.character, () => {
  resetAlert()
})
</script>

<template>
  <div
    class="pet-wrapper"
    :class="[`pet-${character}`, `state-${state}`]"
    @dblclick="(e: MouseEvent) => { emit('click'); resetAlert() }"
    @contextmenu="(e: MouseEvent) => emit('contextMenu', e)"
  >
    <Transition name="bubble-pop">
      <div v-if="state === 'thinking'" class="bubble thinking-bubble">
        <span class="dot-anim"><i></i><i></i><i></i></span>
      </div>
    </Transition>
    <Transition name="bubble-pop">
      <div v-if="state === 'talking'" class="bubble talking-bubble">
        <span class="talking-anim">💬</span>
      </div>
    </Transition>
    <Transition name="bubble-pop">
      <div v-if="showAlertBubble" class="bubble alert-bubble">嘿，还在吗？✨</div>
    </Transition>

    <div class="character-body">
      <template v-if="character === 'yier'">
        <div class="yier" :class="{ blinking: isBlinking, thinking: state === 'thinking', talking: state === 'talking', waving: isWaving }">
          <div class="ear ear-l"></div>
          <div class="ear ear-r"></div>
          <div class="head">
            <div class="face">
              <div class="eyes">
                <div class="eye eye-l" :class="{ closed: isBlinking }">
                  <div class="pupil"></div>
                  <div class="highlight"></div>
                </div>
                <div class="eye eye-r" :class="{ closed: isBlinking }">
                  <div class="pupil"></div>
                  <div class="highlight"></div>
                </div>
              </div>
              <div class="cheeks">
                <div class="cheek cheek-l"></div>
                <div class="cheek cheek-r"></div>
              </div>
              <div class="nose"></div>
              <div class="mouth" :class="{ open: state === 'talking' }"></div>
            </div>
          </div>
          <div class="body">
            <div class="arm arm-l" :class="{ waving: isWaving }"></div>
            <div class="arm arm-r"></div>
            <div class="belly"></div>
            <div class="heart">❤️</div>
          </div>
          <div class="foot foot-l"></div>
          <div class="foot foot-r"></div>
          <div class="tail"></div>
        </div>
      </template>

      <template v-if="character === 'bubu'">
        <div class="bubu" :class="{ blinking: isBlinking, thinking: state === 'thinking', happy: state === 'happy', talking: state === 'talking' }">
          <div class="ear ear-l"></div>
          <div class="ear ear-r"></div>
          <div class="head">
            <div class="face">
              <div class="eyes">
                <div class="eye eye-l" :class="{ closed: isBlinking }">
                  <div class="pupil"></div>
                  <div class="highlight"></div>
                </div>
                <div class="eye eye-r" :class="{ closed: isBlinking }">
                  <div class="pupil"></div>
                  <div class="highlight"></div>
                </div>
              </div>
              <div class="cheeks">
                <div class="cheek cheek-l"></div>
                <div class="cheek cheek-r"></div>
              </div>
              <div class="nose"></div>
              <div class="mouth" :class="{ open: state === 'talking' }"></div>
            </div>
          </div>
          <div class="body">
            <div class="arm arm-l"></div>
            <div class="arm arm-r"></div>
            <div class="belly"></div>
          </div>
          <div class="foot foot-l"></div>
          <div class="foot foot-r"></div>
          <div class="tail"></div>
        </div>
      </template>
    </div>

    <div class="ground-shadow" :class="{ bouncing: state === 'idle' }"></div>
  </div>
</template>

<style scoped>
.pet-wrapper {
  position: relative;
  width: 160px;
  height: 200px;
  cursor: grab;
  -webkit-app-region: drag;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.15));
}
.pet-wrapper:active { cursor: grabbing; }

.character-body {
  position: relative;
  width: 100%;
  height: 100%;
  contain: layout style paint;
  will-change: transform;
}

.bubble {
  position: absolute;
  top: -45px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  -webkit-app-region: no-drag;
}
.thinking-bubble { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
.talking-bubble { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
.alert-bubble { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; animation: float-gentle 2s ease-in-out infinite; }

.dot-anim i {
  display: inline-block;
  width: 6px; height: 6px;
  background: white;
  border-radius: 50%;
  margin: 0 2px;
  animation: dot-bounce 1.4s ease-in-out infinite;
}
.dot-anim i:nth-child(2) { animation-delay: 0.2s; }
.dot-anim i:nth-child(3) { animation-delay: 0.4s; }

.talking-anim {
  display: inline-block;
  animation: talk-pulse 0.6s ease-in-out infinite;
}

@keyframes dot-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
@keyframes talk-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
@keyframes float-gentle { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-5px)} }

.bubble-pop-enter-active { animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.bubble-pop-leave-active { animation: pop-in 0.2s ease-in reverse; }
@keyframes pop-in { from{opacity:0;transform:translateX(-50%) scale(0.5)} to{opacity:1;transform:translateX(-50%) scale(1)} }

.ground-shadow {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 12px;
  background: radial-gradient(ellipse, rgba(0,0,0,0.2) 0%, transparent 70%);
  border-radius: 50%;
  animation: shadow-breathe 3s ease-in-out infinite;
}
.ground-shadow.bouncing { animation: shadow-breathe 3s ease-in-out infinite, shadow-pulse 1.5s ease-in-out infinite; }

@keyframes shadow-breathe { 0%,100%{transform:translateX(-50%) scaleX(1)} 50%{transform:translateX(-50%) scaleX(1.1)} }
@keyframes shadow-pulse { 0%,100%{opacity:0.8} 50%{opacity:0.5} }

/* ==================== 一二：可爱白色小猫 ==================== */
.yier {
  position: relative;
  animation: yier-breathe 3s ease-in-out infinite;
}
.yier.thinking { animation: yier-think 0.8s ease-in-out infinite; }
.yier.talking { animation: yier-talk 0.3s ease-in-out infinite; }

.yier .ear {
  position: absolute;
  width: 35px;
  height: 40px;
  background: linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%);
  top: 5px;
  z-index: 0;
  border-radius: 50% 50% 0 0;
}
.yier .ear::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 22px;
  background: linear-gradient(135deg, #ffb6c1 0%, #ff69b4 100%);
  border-radius: 50% 50% 0 0;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
}
.yier .ear-l { left: 18px; transform: rotate(-15deg); }
.yier .ear-r { right: 18px; transform: rotate(15deg); }

.yier .head {
  position: absolute;
  width: 100px;
  height: 90px;
  background: linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%);
  border-radius: 50px 50px 45px 45px;
  top: 25px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05), inset 0 -2px 4px rgba(0,0,0,0.02);
}

.yier .face {
  position: relative;
  width: 100%;
  height: 100%;
}

.yier .eyes {
  display: flex;
  justify-content: center;
  gap: 28px;
  padding-top: 25px;
}

.yier .eye {
  width: 18px;
  height: 20px;
  background: #1a1a2e;
  border-radius: 50%;
  position: relative;
  transition: all 0.15s ease;
  overflow: hidden;
}
.yier .eye.closed {
  height: 4px;
  border-radius: 2px;
  margin-top: 8px;
}

.yier .pupil {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #0f0f23;
  border-radius: 50%;
  top: 4px;
  left: 3px;
  animation: look-around 4s ease-in-out infinite;
}

.yier .highlight {
  position: absolute;
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
  top: 4px;
  left: 4px;
  z-index: 1;
}

.yier .cheeks {
  display: flex;
  justify-content: space-between;
  padding: 0 10px;
  margin-top: 5px;
}

.yier .cheek {
  width: 18px;
  height: 10px;
  background: rgba(255, 182, 193, 0.5);
  border-radius: 50%;
  animation: cheek-pulse 2s ease-in-out infinite;
}

.yier .nose {
  position: absolute;
  width: 8px;
  height: 6px;
  background: #ffb6c1;
  border-radius: 50%;
  top: 48px;
  left: 50%;
  transform: translateX(-50%);
}

.yier .mouth {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 8px;
  transition: all 0.2s ease;
}
.yier .mouth::before, .yier .mouth::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 6px;
  border-bottom: 2.5px solid #ccc;
  border-radius: 0 0 50% 50%;
  transition: all 0.2s ease;
}
.yier .mouth::before { left: 0; }
.yier .mouth::after { right: 0; }
.yier .mouth.open {
  height: 12px;
  width: 16px;
  background: #ff6b6b;
  border-radius: 0 0 50% 50%;
}
.yier .mouth.open::before, .yier .mouth.open::after {
  display: none;
}

.yier .body {
  position: absolute;
  width: 80px;
  height: 55px;
  background: linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%);
  border-radius: 40px 40px 30px 30px;
  top: 110px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.yier .belly {
  position: absolute;
  width: 50px;
  height: 35px;
  background: linear-gradient(180deg, #fff5f5 0%, #ffe8e8 100%);
  border-radius: 50%;
  top: 115px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

.yier .heart {
  position: absolute;
  font-size: 14px;
  top: 120px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  opacity: 0;
  animation: heart-appear 3s ease-in-out infinite;
}

.yier .arm {
  position: absolute;
  width: 20px;
  height: 35px;
  background: linear-gradient(180deg, #f8f8f8 0%, #e8e8e8 100%);
  border-radius: 10px;
  top: 112px;
  z-index: 0;
  transition: transform 0.3s ease;
}
.yier .arm::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 12px;
  background: #f0f0f0;
  border-radius: 10px;
  bottom: 0;
}
.yier .arm-l {
  left: 8px;
  transform: rotate(10deg);
  transform-origin: top center;
}
.yier .arm-l.waving {
  animation: wave 0.8s ease-in-out;
}
.yier .arm-r { right: 8px; transform: rotate(-10deg); }

.yier .foot {
  position: absolute;
  width: 28px;
  height: 16px;
  background: linear-gradient(180deg, #f0f0f0 0%, #e0e0e0 100%);
  border-radius: 14px 14px 10px 10px;
  bottom: 5px;
  z-index: 1;
}
.yier .foot-l { left: 35px; }
.yier .foot-r { right: 35px; }

.yier .tail {
  position: absolute;
  width: 40px;
  height: 15px;
  background: linear-gradient(90deg, #f8f8f8 0%, #e8e8e8 100%);
  border-radius: 10px;
  top: 130px;
  right: -15px;
  z-index: 0;
  transform-origin: left center;
  animation: tail-wag 2s ease-in-out infinite;
}

@keyframes yier-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes yier-think {
  0%, 100% { transform: translateY(0) rotate(0); }
  25% { transform: translateY(-3px) rotate(-3deg); }
  75% { transform: translateY(-3px) rotate(3deg); }
}
@keyframes yier-talk {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
@keyframes look-around {
  0%, 40%, 100% { transform: translateX(0); }
  10% { transform: translateX(-2px); }
  25% { transform: translateX(2px); }
}
@keyframes cheek-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}
@keyframes heart-appear {
  0%, 70%, 100% { opacity: 0; transform: translateX(-50%) scale(0.8); }
  80%, 90% { opacity: 1; transform: translateX(-50%) scale(1); }
}
@keyframes wave {
  0% { transform: rotate(10deg); }
  25% { transform: rotate(-30deg); }
  50% { transform: rotate(10deg); }
  75% { transform: rotate(-20deg); }
  100% { transform: rotate(10deg); }
}
@keyframes tail-wag {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

/* ==================== 布布：可爱粉色小狗 ==================== */
.bubu {
  position: relative;
  animation: bubu-float 2s ease-in-out infinite;
}
.bubu.thinking { animation: bubu-think 0.6s ease-in-out infinite; }
.bubu.happy { animation: bubu-spin 0.7s ease-in-out; }
.bubu.talking { animation: bubu-talk 0.3s ease-in-out infinite; }

.bubu .ear {
  position: absolute;
  width: 28px;
  height: 40px;
  background: linear-gradient(135deg, #ffb6c1 0%, #ff69b4 100%);
  top: 10px;
  z-index: 0;
  border-radius: 50% 50% 40% 40%;
  transform-origin: top center;
}
.bubu .ear::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 22px;
  background: linear-gradient(135deg, #ffc0cb 0%, #ffb6c1 100%);
  border-radius: 50%;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
}
.bubu .ear-l { left: 15px; transform: rotate(-20deg); }
.bubu .ear-r { right: 15px; transform: rotate(20deg); }

.bubu .head {
  position: absolute;
  width: 105px;
  height: 95px;
  background: linear-gradient(180deg, #ffb6c1 0%, #ff69b4 100%);
  border-radius: 52px 52px 48px 48px;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  box-shadow: 0 4px 8px rgba(255,105,180,0.2);
}

.bubu .face {
  position: relative;
  width: 100%;
  height: 100%;
}

.bubu .eyes {
  display: flex;
  justify-content: center;
  gap: 30px;
  padding-top: 28px;
}

.bubu .eye {
  width: 20px;
  height: 22px;
  background: #1a1a2e;
  border-radius: 50%;
  position: relative;
  transition: all 0.15s ease;
  overflow: hidden;
}
.bubu .eye.closed {
  height: 4px;
  border-radius: 2px;
  margin-top: 9px;
}

.bubu .pupil {
  position: absolute;
  width: 14px;
  height: 14px;
  background: #0f0f23;
  border-radius: 50%;
  top: 4px;
  left: 3px;
}

.bubu .highlight {
  position: absolute;
  width: 7px;
  height: 7px;
  background: white;
  border-radius: 50%;
  top: 4px;
  left: 5px;
  z-index: 1;
}

.bubu .cheeks {
  display: flex;
  justify-content: space-between;
  padding: 0 12px;
  margin-top: 5px;
}

.bubu .cheek {
  width: 20px;
  height: 12px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
}

.bubu .nose {
  position: absolute;
  width: 12px;
  height: 8px;
  background: #ff1493;
  border-radius: 50% 50% 40% 40%;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
}

.bubu .mouth {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 22px;
  height: 8px;
  transition: all 0.2s ease;
}
.bubu .mouth::before, .bubu .mouth::after {
  content: '';
  position: absolute;
  width: 11px;
  height: 6px;
  border-bottom: 2.5px solid #cc3366;
  border-radius: 0 0 50% 50%;
  transition: all 0.2s ease;
}
.bubu .mouth::before { left: 0; }
.bubu .mouth::after { right: 0; }
.bubu .mouth.open {
  height: 14px;
  width: 18px;
  background: #ff1493;
  border-radius: 0 0 50% 50%;
}
.bubu .mouth.open::before, .bubu .mouth.open::after {
  display: none;
}

.bubu .body {
  position: absolute;
  width: 85px;
  height: 58px;
  background: linear-gradient(180deg, #ffb6c1 0%, #ff69b4 100%);
  border-radius: 42px 42px 32px 32px;
  top: 110px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  box-shadow: 0 4px 8px rgba(255,105,180,0.2);
}

.bubu .belly {
  position: absolute;
  width: 55px;
  height: 38px;
  background: linear-gradient(180deg, #fff0f5 0%, #ffe4e9 100%);
  border-radius: 50%;
  top: 115px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

.bubu .arm {
  position: absolute;
  width: 22px;
  height: 38px;
  background: linear-gradient(180deg, #ffb6c1 0%, #ff69b4 100%);
  border-radius: 11px;
  top: 112px;
  z-index: 0;
}
.bubu .arm-l { left: 8px; transform: rotate(12deg); animation: wave-l 2s ease-in-out infinite; }
.bubu .arm-r { right: 8px; transform: rotate(-12deg); animation: wave-r 2s ease-in-out infinite; }

.bubu .foot {
  position: absolute;
  width: 30px;
  height: 18px;
  background: linear-gradient(180deg, #ff69b4 0%, #ff1493 100%);
  border-radius: 15px 15px 12px 12px;
  bottom: 5px;
  z-index: 1;
}
.bubu .foot-l { left: 33px; }
.bubu .foot-r { right: 33px; }

.bubu .tail {
  position: absolute;
  width: 20px;
  height: 25px;
  background: linear-gradient(135deg, #ffb6c1 0%, #ff69b4 100%);
  border-radius: 50%;
  top: 105px;
  right: 12px;
  z-index: 0;
  animation: tail-wag 1s ease-in-out infinite alternate;
  will-change: transform;
  transform-origin: bottom center;
}

@keyframes bubu-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes bubu-think { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-4px) rotate(3deg)} }
@keyframes bubu-spin { 0%{transform:rotate(0) scale(1)} 50%{transform:rotate(180deg) scale(1.08)} 100%{transform:rotate(360deg) scale(1)} }
@keyframes bubu-talk { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
@keyframes wave-l { 0%,100%{transform:rotate(12deg)} 50%{transform:rotate(25deg)} }
@keyframes wave-r { 0%,100%{transform:rotate(-12deg)} 50%{transform:rotate(-25deg)} }
@keyframes tail-wag { from{transform:rotate(-20deg)} to{transform:rotate(20deg)} }
</style>
