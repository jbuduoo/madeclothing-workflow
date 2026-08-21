import { api, assetUrl } from "../api";
import urgentUrl from "../assets/urgent.png";
import completedUrl from "../assets/completed.png";

export default {
  data() {
    return {
      username: this.$route.query.username || "test",
      orders: [],
      searchQuery: "",
      isModalOpen: false,
      currentImage: "",
      loading: true,
      error: "",
      urgentUrl,
      completedUrl,
    };
  },
  computed: {
    sortedOrders() {
      return [...this.orders].sort((left, right) => {
        const leftNumber = Number(String(left.id || "").match(/^A(\d+)$/)?.[1] || 0);
        const rightNumber = Number(String(right.id || "").match(/^A(\d+)$/)?.[1] || 0);
        if (leftNumber !== rightNumber) return rightNumber - leftNumber;
        return String(right.orderDate || "").localeCompare(String(left.orderDate || ""));
      });
    },
    filteredOrders() {
      if (!this.searchQuery) return this.sortedOrders;
      return this.sortedOrders.filter((order) => order.customer.includes(this.searchQuery));
    },
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    assetUrl,
    async fetchData() {
      this.loading = true;
      this.error = "";
      try {
        const response = await api.get("/dashboard-data");
        this.orders = response.data.data;
      } catch (error) {
        this.error = "讀取訂單失敗，請確認後端是否已啟動。";
      } finally {
        this.loading = false;
      }
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
    goToNewOrder() {
      this.$router.push({ name: "NewOrder", query: { username: this.username } });
    },
    goToEditPage(order) {
      this.$router.push({
        name: "EditPage",
        params: { id: order.id },
        query: { image: order.image, username: this.username },
      });
    },
  },
  template: `
    <main class="dashboard">
      <header class="topbar">
        <div class="username">&#30331;&#20837;&#24115;&#34399;&#65306;{{ username }}</div>
        <label class="search-bar">
          <span>&#25628;&#23563;</span>
          <input v-model="searchQuery" type="text" placeholder="&#35531;&#36664;&#20837;&#23458;&#25142;&#21517;&#31281;" />
        </label>
        <button class="primary-btn" @click="goToNewOrder">&#26032;&#22686;&#35330;&#21934;</button>
        <button class="logout-btn" @click="handleLogout">&#30331;&#20986;</button>
      </header>

      <p v-if="loading" class="status-message">&#36617;&#20837;&#20013;...</p>
      <p v-else-if="error" class="status-message error">{{ error }}</p>

      <section v-else class="orders">
        <article v-for="order in filteredOrders" :key="order.id" class="order-card" :class="{ urgent: order.urgent }">
          <div class="order-top">
            <div class="order-info">
              <template v-if="order.urgent">
                <img class="urgent-image" :src="urgentUrl" alt="&#24613;&#20214;" />
                <strong>{{ order.deliveryDate }} &#21069;&#23436;&#25104;</strong>
              </template>
              <strong class="blue">&#19979;&#21934;&#65306;{{ order.orderDate }}</strong>
              <strong class="blue">&#23458;&#25142;&#65306;{{ order.customer }}</strong>
            </div>
            <button class="edit-button" @click="goToEditPage(order)"><span aria-hidden="true">✎</span>&#36039;&#26009;&#20462;&#25913;</button>
          </div>

          <div v-if="order.completionTime" class="completed-container">
            <img :src="completedUrl" alt="&#24050;&#23436;&#25104;" />
            <span>&#23436;&#25104;&#26178;&#38291;&#65306;{{ order.completionTime }}</span>
          </div>

          <div class="order-middle">
            <button class="image-button" @click="openModal(assetUrl(order.image))">
              <img :src="assetUrl(order.image)" alt="&#21830;&#21697;&#22294;&#29255;" />
            </button>
            <div class="details-section">
              <section>
                <h2>&#20839;&#37096;&#20316;&#26989;</h2>
                <div class="button-grid workflow-buttons">
                  <button v-for="step in order.steps" :key="step.name" :class="{ active: step.completed }">{{ step.name }}</button>
                </div>
              </section>
              <section>
                <h2>&#24288;&#21830;</h2>
                <div class="button-grid vendor-buttons">
                  <button v-for="vendor in order.vendors" :key="vendor.name" :class="{ active: vendor.active }">{{ vendor.name }}</button>
                </div>
              </section>
              <section class="financials">
                <div><strong>&#36008;&#27454;&#37329;&#38989;</strong><span>{{ order.amount }}</span></div>
                <div><strong>&#31237;&#37329;</strong><span>{{ order.tax }}</span></div>
                <div><strong>&#23614;&#27454;</strong><span>{{ order.balance }}</span></div>
              </section>
            </div>
          </div>
        </article>
      </section>

      <div v-if="isModalOpen" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <img :src="currentImage" alt="&#23436;&#25972;&#22294;&#29255;" />
          <button class="close-button" @click="closeModal">&#38364;&#38281;</button>
        </div>
      </div>
    </main>
  `,
};
