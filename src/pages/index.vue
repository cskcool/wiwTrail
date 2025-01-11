<template>
  <div id="cesiumBox" class="frame-3d">
    <div class="work-bar">
      <!-- <div class="location-icon" @click="showTrailUploader = true">
        <van-icon name="upgrade" size="25px" />
      </div> -->
      <div class="location-icon" @click="callPosition">
        <!-- <van-icon name="location-o" size="3em"/> -->
        <van-icon name="warn-o" size="3em" />
      </div>
      <!-- <div class="location-icon" @click="toSettingPage">
        <van-icon name="setting" size="25px" />
      </div> -->
      <!-- <div class="expand-icon">
      <van-icon v-show="!isFullScreen" name="expand-o" size="25px" @click="fullScreen"/>
      <van-icon v-show="isFullScreen" name="shrink" size="25px" @click="fullScreen"/>
    </div> -->
    </div>
    <div class="animation-bar" v-if="animationPosition.height">
      <div class="speed-control">
        <span> {{ $t('home.animation') }}：</span>
        <van-icon name="arrow-left" @click="slowerAnimationPlay" />
        <van-icon name="pause" @click="stopTraceAnimationPlay" />
        <van-icon name="play" @click="startTraceAnimationPlay" />
        <van-icon name="arrow" @click="fasterTraceAnimationPlay" />
      </div>
      <div class="position-info">
        <span>{{ $t('home.altitude') }}：</span>{{ animationPosition.height }}m
      </div>
      <div class="position-info">
        <span>{{ $t('home.longitude') }}：</span>{{ animationPosition.longitude }}°
      </div>
      <div class="position-info">
        <span>{{ $t('home.latitude') }}：</span>{{ animationPosition.latitude }}°
      </div>
    </div>

  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue';

import {
  viewer,
  rotateAnimationPlayFlag,
  animationPosition,
  initScene,
  cesiumRotateFly,
  cesiumFlyTo,
  stopTraceAnimationPlay,
  startTraceAnimationPlay,
  slowerAnimationPlay,
  fasterTraceAnimationPlay
} from './useCesium'
// import amapTool from '@/utils/amapUtils'

// const showTrailUploader = ref(false)

function callPosition() {
  rotateAnimationPlayFlag.value = false
  viewer.dataSources.removeAll();
  stopTraceAnimationPlay()
  // amapTool.getPositionuseIp({key: 'ea6eae6fc9da7574fa52aab75cef8537'}).then((res:any) => {
  //   const ipLocation: string = res.rectangle.split(';')[1]
  //   const longitude = Number(ipLocation.split(',')[0])
  //   const latitude = Number(ipLocation.split(',')[1])
  //   cesiumFlyTo({longitude, latitude })
  // })
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      var latitude = position.coords.latitude;
      var longitude = position.coords.longitude;
      cesiumFlyTo({ longitude, latitude })
    });
  } else {
    console.log("Geolocation is not supported by this browser.");
  }
}

// function toSettingPage() {
  // router.push('/setting');
// }

// function loadMainScene(uuid: string) {
  // rotateAnimationPlayFlag.value = false
  // getGpxFileUrl({ uuid }).then((res: any) => {
  //   // console.log('====>', params, res.data)
  //   cesiumShowTrace(res.data.data)
  // })
// }

onMounted(() => {
  initScene().then(() => {
    cesiumRotateFly()
    // })
  }).catch(e => {
    console.log('ERR:', e)
  });
});

</script>
<style scoped lang="less">
.frame-3d {
  height: 100vh;
  position: relative;

  :deep(.cesium-viewer) {
    .cesium-viewer-bottom {
      display: none !important;
    }
  }

  :deep(.cesium-viewer-fullscreenContainer) {
    .cesium-fullscreenButton {
      display: none;
    }
  }

  :deep(.cesium-viewer-timelineContainer) {
    .cesium-timeline-main {
      display: none;
    }
  }

  .work-bar {
    position: absolute;
    right: 15px;
    bottom: 15px;
    background: #fff;
    display: flex;
    border-radius: 10px;
    z-index: 9;
    flex-direction: column;

    .location-icon {
      border-bottom: 1px dotted #ccc;
      margin: 5px 10px 0 10px;
      padding-bottom: 5px;
    }

    .expand-icon {
      margin: 0 10px 5px 10px;
    }
  }

  .animation-bar {
    position: absolute;
    left: 15px;
    bottom: 15px;
    background: #fff;
    display: flex;
    border-radius: 10px;
    z-index: 9;
    flex-direction: column;

    .speed-control {
      margin: 5px;
    }

    .position-info {
      margin: 0 5px 5px 5px;
      display: flex;
      align-items: center;
    }
  }
}
</style>

<route lang="json5">
  {
    name: 'home',
    meta: {
      title: '主页',
      i18n: 'menus.home'
    },
  }
  </route>