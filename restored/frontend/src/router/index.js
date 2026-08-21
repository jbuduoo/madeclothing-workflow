import { createRouter, createWebHashHistory } from "vue-router";
import LoginPage from "../components/LoginPage.js";
import UserDashboard from "../components/UserDashboard.js";
import EditPage from "../components/EditPage.js";
import NewOrderPage from "../components/NewOrderPage.js";

const routes = [
  { path: "/", name: "Login", component: LoginPage },
  { path: "/dashboard", name: "Dashboard", component: UserDashboard },
  { path: "/orders/new", name: "NewOrder", component: NewOrderPage },
  {
    path: "/edit/:id",
    name: "EditPage",
    component: EditPage,
    props: (route) => ({
      id: route.params.id,
      image: route.query.image,
    }),
  },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
