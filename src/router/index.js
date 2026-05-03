import { createRouter, createWebHashHistory } from 'vue-router'
// 首页和小鼠列表是常用首屏路径，保留静态 import 以减少首次进入时的异步加载等待。
import HomeView from '../views/DashBoard.vue'
import MiceView from '../views/MiceView.vue'


const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  }
  ,
  {
    path: '/mice',
    name: 'mice',
    component: MiceView
  },
  {
  path: '/mouse/:id',
  name: 'MouseDetail',
  component: () => import('../views/MouseDetailView.vue'),
  props: true
},
  {
  path: '/weight_list',
  name: 'WeightList',
  component: () => import('../views/WeightView.vue')
},
  {
  path: '/experiments/:experimentId',
  name: 'Experiments',
  component: () => import('../views/ExperimentDisplay.vue')
},
  {
  path: '/weight',
  name: 'BodyWeight',
  component: () => import('../views/BodyWeight.vue')
},
  {
  path: '/survival',
  name: 'Survivalplot',
  component: () => import('../views/Survival.vue')
},
  {
  path: '/setting',
  name: 'SystemSettings',
  component: () => import('../views/Setting.vue')
},
  {
  path: '/breeding/progress',
  name: 'BreedingProgress',
  component: () => import('../views/BreedingProgressView.vue')
},
  {
  path: '/breeding/genotyping',
  name: 'Genotyping',
  component: () => import('../views/GenotypingView.vue')
},
  // 添加404处理
  {
    path: '/:pathMatch(.*)*',
    component: () => import('../views/NotFound.vue')
}
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
