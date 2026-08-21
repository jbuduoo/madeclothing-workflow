<template>
  <main class="dashboard">
    <header class="topbar">
      <div class="username">登入帳號：{{ username }}</div>
      <label class="search-bar">
        <span>搜尋</span>
        <input v-model="searchQuery" type="text" placeholder="請輸入客戶名稱" />
      </label>
      <button class="logout-btn" @click="handleLogout">登出</button>
    </header>

    <section class="orders">
      <article v-for="order in filteredOrders" :key="order.id" class="order-card" :class="{ urgent: order.urgent }">
        <div class="order-top">
          <div class="order-info">
            <template v-if="order.urgent">
              <img class="urgent-image" src="../assets/urgent.png" alt="急件" />
              <strong>{{ order.deliveryDate }} 前完成</strong>
            </template>
            <strong class="blue">下單：{{ order.orderDate }}</strong>
            <strong class="blue">客戶：{{ order.customer }}</strong>
          </div>

          <button class="edit-button" @click="goToEditPage(order)">
            <span aria-hidden="true">✎</span>
            資料修改
          </button>
        </div>

        <div v-if="order.completionTime" class="completed-container">
          <img src="../assets/completed.png" alt="已完成" />
          <span>完成時間：{{ order.completionTime }}</span>
        </div>

        <div class="order-middle">
          <button class="image-button" @click="openModal(order.image)">
            <img :src="order.image" alt="商品圖片" />
          </button>

          <div class="details-section">
            <section>
              <h2>內部作業</h2>
              <div class="button-grid workflow-buttons">
                <button v-for="step in order.steps" :key="step.name" :class="{ active: step.completed }">
                  {{ step.name }}
                </button>
              </div>
            </section>

            <section>
              <h2>廠商</h2>
              <div class="button-grid vendor-buttons">
                <button v-for="vendor in order.vendors" :key="vendor.name" :class="{ active: vendor.active }">
                  {{ vendor.name }}
                </button>
              </div>
            </section>

            <section class="financials">
              <div>
                <strong>貨款金額</strong>
                <span>{{ order.amount }}</span>
              </div>
              <div>
                <strong>稅金</strong>
                <span>{{ order.tax }}</span>
              </div>
              <div>
                <strong>尾款</strong>
                <span>{{ order.balance }}</span>
              </div>
            </section>
          </div>
        </div>
      </article>
    </section>

    <div v-if="isModalOpen" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <img :src="currentImage" alt="完整圖片" />
        <button class="close-button" @click="closeModal">關閉</button>
      </div>
    </div>
  </main>
</template>

<script>
import { api } from "../api";

export default {
  data() {
    return {
      username: this.$route.query.username || "測試人員",
      orders: [],
      searchQuery: "",
      isModalOpen: false,
      currentImage: "",
    };
  },
  computed: {
    filteredOrders() {
      if (!this.searchQuery) return this.orders;
      return this.orders.filter((order) => order.customer.includes(this.searchQuery));
    },
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      const response = await api.get("/dashboard-data");
      this.orders = response.data.data;
    },
    openModal(image) {
      this.currentImage = image;
      this.isModalOpen = true;
    },
    closeModal() {
      this.isModalOpen = false;
      this.currentImage = "";
    },
    handleLogout() {
      this.$router.push({ name: "Login" });
    },
    goToEditPage(order) {
      this.$router.push({
        name: "EditPage",
        params: { id: order.id },
        query: { image: order.image, username: this.username },
      });
    },
  },
};
</script>
