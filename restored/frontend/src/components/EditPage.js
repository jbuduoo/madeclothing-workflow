import { api, assetUrl, placeholderUrl } from "../api";

export default {
  props: { id: { type: String, required: true }, image: { type: String, default: "" } },
  data() {
    return {
      orderId: this.id,
      orderImage: this.image,
      workflowSteps: [],
      historyLogs: [],
      loading: true,
      error: "",
      saveMessage: "",
      isModalOpen: false,
      currentStepIndex: null,
      customerName: "",
      orderForm: {
        customer: "",
        orderDate: "",
        deliveryDate: "",
        urgent: false,
        image: this.image || placeholderUrl,
        amount: 0,
        tax: 0,
        balance: 0,
      },
      formData: { user: this.$route.query.username || "test", feedback: "", completed: "" },
    };
  },
  mounted() {
    this.fetchOrder();
    this.fetchWorkflowSteps();
    this.fetchCompletedRecords();
  },
  methods: {
    assetUrl,
    goBack() {
      this.$router.push({ name: "Dashboard", query: { username: this.$route.query.username } });
    },
    handleLogout() {
      this.$router.push({ name: "Login" });
    },
    async fetchOrder() {
      try {
        const response = await api.get(`/orders/${this.orderId}`);
        const order = response.data.order;
        this.orderForm = {
          customer: order.customer,
          orderDate: order.orderDate,
          deliveryDate: order.deliveryDate,
          urgent: order.urgent,
          image: order.image,
          amount: order.amount,
          tax: order.tax,
          balance: order.balance,
        };
        this.orderImage = order.image;
      } catch (error) {
        this.error = "讀取訂單基本資料失敗。";
      }
    },
    async saveOrder() {
      this.saveMessage = "";
      try {
        const response = await api.put(`/orders/${this.orderId}`, this.orderForm);
        this.orderImage = response.data.order.image;
        this.customerName = response.data.order.customer;
        this.saveMessage = "已儲存基本資料。";
      } catch (error) {
        this.saveMessage = "儲存失敗，請稍後再試。";
      }
    },
    async fetchWorkflowSteps() {
      try {
        const response = await api.get(`/get-workflow-steps/${this.orderId}`);
        this.workflowSteps = response.data.workflowSteps;
        this.customerName = response.data.customerName || "未知客戶";
      } catch (error) {
        this.error = "讀取流程失敗，請確認後端是否已啟動。";
      } finally {
        this.loading = false;
      }
    },
    async fetchCompletedRecords() {
      try {
        const response = await api.get(`/get-completed-records/${this.orderId}`);
        this.historyLogs = response.data.historyLogs || [];
      } catch (error) {
        this.error = "讀取歷史紀錄失敗。";
      }
    },
    openForm(index) {
      this.currentStepIndex = index;
      this.formData = { user: this.$route.query.username || "test", feedback: "", completed: "" };
      this.isModalOpen = true;
    },
    closeModal() {
      this.isModalOpen = false;
    },
    async handleSubmit() {
      const currentStep = this.workflowSteps[this.currentStepIndex];
      const completed = this.formData.completed === "true";
      const response = await api.post("/update-workflow-step", {
        orderId: this.orderId,
        stepName: currentStep.name,
        completed,
        user: this.formData.user,
        feedback: this.formData.feedback,
        isfinish: completed ? "已完成" : "未完成",
      });
      currentStep.completed = completed;
      this.historyLogs = response.data.historyLogs || this.historyLogs;
      this.closeModal();
    },
  },
  template: `
    <main class="edit-page">
      <header class="edit-header">
        <button @click="goBack">&#22238;&#39318;&#38913;</button>
        <h1>&#36039;&#26009;&#20462;&#25913; - &#35330;&#21934; {{ orderId }}</h1>
        <button @click="handleLogout">&#30331;&#20986;</button>
      </header>
      <p v-if="loading" class="status-message">&#21152;&#36617;&#20013;...</p>
      <p v-else-if="error" class="status-message error">{{ error }}</p>
      <template v-else>
        <section class="edit-layout">
          <div>
            <img class="order-image" :src="assetUrl(orderImage)" alt="&#35330;&#21934;&#22294;&#29255;" />
            <form class="order-form compact" @submit.prevent="saveOrder">
              <h2>&#35330;&#21934;&#22522;&#26412;&#36039;&#26009;</h2>
              <label>&#23458;&#25142;&#21517;&#31281;<input v-model="orderForm.customer" required /></label>
              <label>&#19979;&#21934;&#26085;<input v-model="orderForm.orderDate" type="date" required /></label>
              <label>&#20132;&#26399;<input v-model="orderForm.deliveryDate" placeholder="20250515" /></label>
              <label class="inline-check"><input v-model="orderForm.urgent" type="checkbox" /> &#24613;&#20214;</label>
              <label>&#22294;&#29255;&#32178;&#22336;<input v-model="orderForm.image" /></label>
              <div class="three-fields">
                <label>&#36008;&#27454;<input v-model.number="orderForm.amount" type="number" min="0" /></label>
                <label>&#31237;&#37329;<input v-model.number="orderForm.tax" type="number" min="0" /></label>
                <label>&#23614;&#27454;<input v-model.number="orderForm.balance" type="number" min="0" /></label>
              </div>
              <div class="form-actions"><button type="submit">&#20786;&#23384;&#22522;&#26412;&#36039;&#26009;</button></div>
              <p v-if="saveMessage" class="save-message">{{ saveMessage }}</p>
            </form>
          </div>

          <div class="edit-workflow">
            <button v-for="(step, index) in workflowSteps" :key="step.name" class="workflow-button" :class="{ completed: step.completed }" @click="openForm(index)">
              <span v-if="step.completed" class="circle"></span>{{ step.name }}
            </button>
          </div>
        </section>
        <section class="history-section">
          <h2>&#27511;&#21490;&#26356;&#26032;&#35352;&#37636;</h2>
          <table>
            <thead><tr><th>&#26178;&#38291;&#25139;&#35352;</th><th>&#38917;&#30446;&#21517;&#31281;</th><th>&#34389;&#29702;&#20154;&#21729;</th><th>&#22238;&#22577;&#20107;&#38917;</th><th>&#23436;&#25104;&#29376;&#24907;</th></tr></thead>
            <tbody>
              <tr v-for="(log, index) in historyLogs" :key="index">
                <td>{{ log.timestamp }}</td><td>{{ log.item }}</td><td>{{ log.user }}</td><td>{{ log.feedback }}</td><td>{{ log.isfinish }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
      <div v-if="isModalOpen" class="modal-overlay">
        <form class="form-modal" @submit.prevent="handleSubmit">
          <h2>&#22635;&#23531;&#36039;&#26009;</h2>
          <label>&#26696;&#20214;&#32232;&#34399;<input :value="orderId" readonly /></label>
          <label>&#23458;&#25142;&#21517;&#31281;<input :value="customerName" readonly /></label>
          <label>&#34389;&#29702;&#20154;&#21729;<input v-model="formData.user" required placeholder="&#36664;&#20837;&#20154;&#21517;" /></label>
          <label>&#22238;&#22577;&#20107;&#38917;<textarea v-model="formData.feedback" required placeholder="&#36664;&#20837;&#25991;&#23383;"></textarea></label>
          <label>&#26159;&#21542;&#23436;&#25104;<select v-model="formData.completed" required><option disabled value="">&#35531;&#36984;&#25799;</option><option value="true">&#24050;&#23436;&#25104;</option><option value="false">&#26410;&#23436;&#25104;</option></select></label>
          <div class="form-actions"><button type="submit">&#25552;&#20132;</button><button type="button" @click="closeModal">&#21462;&#28040;</button></div>
        </form>
      </div>
    </main>
  `,
};
