<template>
  <main class="edit-page">
    <header class="edit-header">
      <button @click="goBack">回首頁</button>
      <h1>資料修改 - 訂單 {{ orderId }}</h1>
      <button @click="handleLogout">登出</button>
    </header>

    <p v-if="loading" class="loading">加載中...</p>

    <template v-else>
      <section class="edit-layout">
        <img class="order-image" :src="orderImage" alt="訂單圖片" />

        <div class="edit-workflow">
          <button
            v-for="(step, index) in workflowSteps"
            :key="step.name"
            class="workflow-button"
            :class="{ completed: step.completed }"
            @click="openForm(index)"
          >
            <span v-if="step.completed" class="circle"></span>
            {{ step.name }}
          </button>
        </div>
      </section>

      <section class="history-section">
        <h2>歷史更新記錄</h2>
        <table>
          <thead>
            <tr>
              <th>時間戳記</th>
              <th>項目名稱</th>
              <th>處理人員</th>
              <th>回報事項</th>
              <th>完成狀態</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(log, index) in historyLogs" :key="index">
              <td>{{ log.timestamp }}</td>
              <td>{{ log.item }}</td>
              <td>{{ log.user }}</td>
              <td>{{ log.feedback }}</td>
              <td>{{ log.isfinish }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <div v-if="isModalOpen" class="modal-overlay">
      <form class="form-modal" @submit.prevent="handleSubmit">
        <h2>填寫資料</h2>
        <label>
          案件編號
          <input :value="orderId" readonly />
        </label>
        <label>
          客戶名稱
          <input :value="customerName" readonly />
        </label>
        <label>
          處理人員
          <input v-model="formData.user" required placeholder="輸入人名" />
        </label>
        <label>
          回報事項
          <textarea v-model="formData.feedback" required placeholder="輸入文字"></textarea>
        </label>
        <label>
          是否完成
          <select v-model="formData.completed" required>
            <option disabled value="">請選擇</option>
            <option value="true">已完成</option>
            <option value="false">未完成</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit">提交</button>
          <button type="button" @click="closeModal">取消</button>
        </div>
      </form>
    </div>
  </main>
</template>

<script>
import { api } from "../api";

export default {
  props: {
    id: { type: String, required: true },
    image: { type: String, default: "" },
  },
  data() {
    return {
      orderId: this.id,
      orderImage: this.image,
      workflowSteps: [],
      historyLogs: [],
      loading: true,
      isModalOpen: false,
      currentStepIndex: null,
      customerName: "",
      formData: {
        user: this.$route.query.username || "測試人員",
        feedback: "",
        completed: "",
      },
    };
  },
  mounted() {
    this.fetchWorkflowSteps();
    this.fetchCompletedRecords();
  },
  methods: {
    goBack() {
      this.$router.push({ name: "Dashboard", query: { username: this.$route.query.username } });
    },
    handleLogout() {
      this.$router.push({ name: "Login" });
    },
    async fetchWorkflowSteps() {
      try {
        const response = await api.get(`/get-workflow-steps/${this.orderId}`);
        this.workflowSteps = response.data.workflowSteps;
        this.customerName = response.data.customerName || "未知客戶";
      } finally {
        this.loading = false;
      }
    },
    async fetchCompletedRecords() {
      const response = await api.get(`/get-completed-records/${this.orderId}`);
      this.historyLogs = response.data.historyLogs || [];
    },
    openForm(index) {
      this.currentStepIndex = index;
      this.formData = {
        user: this.$route.query.username || "測試人員",
        feedback: "",
        completed: "",
      };
      this.isModalOpen = true;
    },
    closeModal() {
      this.isModalOpen = false;
    },
    async handleSubmit() {
      const currentStep = this.workflowSteps[this.currentStepIndex];
      const completed = this.formData.completed === "true";
      await api.post("/update-workflow-step", {
        orderId: this.orderId,
        stepName: currentStep.name,
        completed,
        user: this.formData.user,
        feedback: this.formData.feedback,
        isfinish: completed ? "已完成" : "未完成",
      });
      currentStep.completed = completed;
      await this.fetchCompletedRecords();
      this.closeModal();
    },
  },
};
</script>
