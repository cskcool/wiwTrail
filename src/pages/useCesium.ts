import * as Cesium from 'cesium'
import { reactive, ref } from 'vue'
import { showToast } from 'vant'
import dayjs from 'dayjs'

const { t } = i18n.global
// import mode3durl from '@/assets/3dMode/psyduck.gltf?url'
let viewer = reactive<any>({})
const rotateAnimationPlayFlag = ref(true)
const animationPosition = ref<any>({})
// 控制开始结束更快更慢
let clockViewModel = reactive<any>({})
// 控制动画暂停播放
let animationViewModel = reactive<any>({})
// 加载地形数据方便计算高度

interface PositionData {
  longitude: number
  latitude: number
}
// 默认位置为中国上空
Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(
  75.0, // 东
  0.0, // 南
  140.0, // 西
  60.0, // 北
)
Cesium.Ion.defaultAccessToken
  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhMzdmMDkyMi1hYzMwLTQzMDUtYTdhZS1jOTgzMmE0YTljMmYiLCJpZCI6MTcyMDExLCJpYXQiOjE2OTc0MjQwMjd9.bGFVBPOJoS6GPENs5Uu7LOCb5tTkDlQjIaKrPAvlHrU'
function initScene() {
  return new Promise((resolve, reject) => {
    viewer = new Cesium.Viewer('cesiumBox', {
      geocoder: false,
      homeButton: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      animation: false,
      timeline: true,
      terrain: Cesium.Terrain.fromWorldTerrain(),
    })

    clockViewModel = new Cesium.ClockViewModel(viewer.clock)
    animationViewModel = new Cesium.AnimationViewModel(clockViewModel)

    if (viewer) {
      resolve(viewer)
    }
    else {
      reject(new Error('create viewer fail!'))
    }
  })
}

function cesiumFlyTo<T extends PositionData>(
  location: T,
  height: number = 800,
  heading: number = 0.0,
  pitch: number = -70.0,
  roll: number = 0.0,
) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      location.longitude,
      location.latitude,
      height,
    ),
    orientation: {
      heading: Cesium.Math.toRadians(heading),
      pitch: Cesium.Math.toRadians(pitch),
      roll: Cesium.Math.toRadians(roll),
    },
  })
  // 接触相机视角锁定
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
}

// 显示路径
function cesiumShowTrace(gpxml: string) {
  const gpxText = gpxml.replace(/GPX\/1\/0"/g, 'GPX/1/1"')
  const parser = new DOMParser()
  const xmlObject = parser.parseFromString(gpxText, 'text/xml')
  const fileUrl = xmlObject
  viewer.dataSources.removeAll()
  // const pinBuilder = new Cesium.PinBuilder();
  viewer.dataSources
    .add(
      Cesium.GpxDataSource.load(fileUrl, {
        clampToGround: true,
        trackColor: Cesium.Color.fromCssColorString('#007ACC') as any,
        waypointImage: 'none',
        // waypointImage: pinBuilder.fromMakiIconId("disability", Cesium.Color.BLUE, 148) as any
      }),
    )
    .then((dataSource: any) => {
      viewer.flyTo(dataSource.entities)
      showToast({
        message: t('home.showTraceReviewTip'),
        position: 'bottom',
      })
      setTimeout(() => {
        followTrace(fileUrl)
      }, 5000)
    })
  viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED
  viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK
}

// 定点环绕
function cesiumRotateFly() {
  const longitudeInDegrees = 138.730331 // 示例经度，单位为度
  const latitudeInDegrees = 35.36307 // 示例纬度，单位为度
  const height = 3626.0426275055174 // 高度，单位为米
  // Lock camera to a point
  const center = Cesium.Cartesian3.fromRadians(
    Cesium.Math.toRadians(longitudeInDegrees),
    Cesium.Math.toRadians(latitudeInDegrees),
    height,
  )
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center)
  viewer.scene.camera.lookAtTransform(
    transform,
    new Cesium.HeadingPitchRange(0, -Math.PI / 8, 2900),
  )

  // Orbit this point
  viewer.clock.onTick.addEventListener(() => {
    if (rotateAnimationPlayFlag.value === true) {
      viewer.scene.camera.rotateRight(0.0015)
    }
  })
}

// 相机跟随路径
async function followTrace(dataSource: any) {
  const terrainProvider = await Cesium.createWorldTerrainAsync()
  // 从gpx文件中提取的经纬度和时间
  const trackPoints = []
  // 根据经纬度和地形数据计算出的3d位置数据
  const trackPoints3dTemp = []
  let trackPoints3d = <any>[]
  viewer.dataSources.removeAll()

  // 查找轨迹点
  const trackPointsXml = dataSource.getElementsByTagName('trkpt')
  for (let i = 0; i < trackPointsXml.length; i++) {
    const trackPointXml = trackPointsXml[i]

    // 获取轨迹点的经纬度
    const latitude = Number.parseFloat(trackPointXml.getAttribute('lat'))
    const longitude = Number.parseFloat(trackPointXml.getAttribute('lon'))
    const time: any = dayjs().add(i, 'second').format('YYYY-MM-DDTHH:mm:ssZ')

    // 创建Cesium.Cartographic对象
    const cartographic = { longitude, latitude, time }
    // 将Cesium.Cartographic对象添加到轨迹点数组
    trackPoints.push(cartographic)
    trackPoints3dTemp.push(
      Cesium.Cartographic.fromDegrees(longitude, latitude),
    )
  }

  // 控制动画暂停播放
  clockViewModel.startTime = Cesium.JulianDate.fromIso8601(trackPoints[0].time)
  clockViewModel.stopTime = Cesium.JulianDate.fromIso8601(
    trackPoints[trackPoints.length - 1].time,
  )
  clockViewModel.currentTime = clockViewModel.startTime

  // 制作一个可以符合czml格式并且带有高度的轨迹，准备添加到czml文件的cartographicDegrees数组
  trackPoints3d = await Cesium.sampleTerrainMostDetailed(
    terrainProvider,
    trackPoints3dTemp,
  )

  // 创建czml数据方便cesium处理轨迹动画
  const czml = [
    {
      id: 'document',
      name: 'CZML Path',
      version: '1.0',
      clock: {
        interval: `${trackPoints[0].time}/${
          trackPoints[trackPoints.length - 1].time
        }`,
        currentTime: trackPoints[0].time,
        multiplier: 2,
      },
    },
    {
      id: 'path',
      name: 'path with GPS flight data',
      path: {
        width: 5,
        leadTime: 2,
        trailTime: dayjs(trackPoints[trackPoints.length - 1].time).diff(
          dayjs(trackPoints[0].time),
          'second',
        ),
        resolution: 5,
        material: {
          solidColor: {
            color: {
              rgba: [255, 127, 39, 255],
            },
          },
        },
      },
      billboard: {
        image:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAFiUAABYlAUlSJPAAAAC1SURBVDhPrZGxDcIwFES9DV0WoGOxFCkpqFmChg1ggAyQYQzGT7ET3c+3JZ70mu+7U6SEI+J4ikqe21EjSuI2qtQi9S0q2CMzBRXqkZmMCqzuURlkzhj0EB17LOmhOl/9r1teMd4u2fnBEUTXH7yey30aOELdQX8wjVhv9R39wfe93J8jR6g7+P+fYv5pD9H5jSXU4+oelUHmMirQIzMFFeqRmS0q2CJ1G1VSEm9HjSR5FoTwAQ1YnDqFBfAuAAAAAElFTkSuQmCC',
        scale: 1.5,
        eyeOffset: {
          cartesian: [0.0, 0.0, -20.0],
        },
      },
      orientation: {
        velocityReference: '#position',
      },
      position: {
        epoch: trackPoints[0].time,
        cartographicDegrees: <any>[],
        clampToGround: true,
      },
    },
  ]
  for (let index = 0; index < trackPoints.length; index++) {
    const element = trackPoints[index]
    // console.log('------------>', updatedPositions, trackPoints3d);
    czml[1].position?.cartographicDegrees.push(index)
    czml[1].position?.cartographicDegrees.push(element.longitude)
    czml[1].position?.cartographicDegrees.push(element.latitude)
    czml[1].position?.cartographicDegrees.push(
      trackPoints3d[index].height + 3.5,
    )
  }
  // console.log('--------------->>>>', czml, dataSource);
  viewer.dataSources.add(Cesium.CzmlDataSource.load(czml)).then((ds: any) => {
    const flyEntity = ds.entities.getById('path')

    flyEntity.position.setInterpolationOptions({
      interpolationDegree: 5,
      interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
    })
    viewer.trackedEntity = flyEntity
    viewer.clock.onTick.addEventListener((clock: any) => {
      if (viewer.trackedEntity) {
        // 平面坐标系
        const cartesian = viewer.trackedEntity.position.getValue(
          clock.currentTime,
        )
        // 平面转弧度坐标系
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
        // 设置相机距离
        // viewer.trackedEntity.viewFrom = new Cesium.Cartesian3(cartographic.longitude,cartographic.latitude, cartographic.height + 500)
        // viewer.scene.camera.
        // 弧度转经纬度
        const longitude = Number(
          Cesium.Math.toDegrees(cartographic.longitude).toFixed(4),
        )
        const latitude = Number(
          Cesium.Math.toDegrees(cartographic.latitude).toFixed(4),
        )
        const height = Number(cartographic.height.toFixed(2))
        // cesiumFlyTo({longitude, latitude}, height + 100)
        animationPosition.value = { longitude, latitude, height }
        // console.log('-------->', animationPosition);
      }
    })
  })
}

function startTraceAnimationPlay() {
  animationViewModel.playForwardViewModel.command()
}

function stopTraceAnimationPlay() {
  animationViewModel.pauseViewModel.command()
}

function slowerAnimationPlay() {
  clockViewModel.multiplier = 0.5 * clockViewModel.multiplier
}

function fasterTraceAnimationPlay() {
  clockViewModel.multiplier = 2 * clockViewModel.multiplier
}

export {
  viewer,
  rotateAnimationPlayFlag,
  animationPosition,
  initScene,
  cesiumFlyTo,
  cesiumShowTrace,
  cesiumRotateFly,
  stopTraceAnimationPlay,
  startTraceAnimationPlay,
  slowerAnimationPlay,
  fasterTraceAnimationPlay,
}
