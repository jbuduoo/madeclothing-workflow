import { api, placeholderUrl } from "../api";

export default {
  data() {
    return {
      username: this.$route.query.username || "test",
      saving: false,
      error: "",
      form: {
        customer: "",
        orderDate: new Date().toISOString().slice(0, 10),
        deliveryDate: "",
        urgent: true,
        image: placeholderUrl,
        amount: 0,
        tax: 0,
        balance: 0,
      },
    };
  },
  methods: {
    goBack() {
      this.$router.push({ name: "Dashboard", query: { username: this.username } });
    },
    async submit() {
      this.saving = true;
      this.error = "";
      try {
        const response = await api.post("/orders", this.form);
        this.$router.push({
          name: "EditPage",
          params: { id: response.data.order.id },
          query: { username: this.username, image: response.data.order.image },
        });
      } catch (error) {
        this.error = "新增訂單失敗，請檢查欄位後再試。";
      } finally {
        this.saving = false;
      }
    },
  },
  template: `
    <main class="edit-page">
      <header class="edit-header">
        <button @click="goBack">&#22238;&#39318;&#38913;</button>
        <h1>&#26032;&#22686;&#35330;&#21934;</h1>
        <button @click="goBack">&#21462;&#28040;</button>
      </header>

      <form class="order-form" @submit.prevent="submit">
        <p v-if="error" class="status-message error">{{ error }}</p>
        <label>&#23458;&#25142;&#21517;&#31281;<input v-model="form.customer" required /></label>
        <label>&#19979;&#21934;&#26085;<input v-model="form.orderDate" type="date" required /></label>
        <label>&#20132;&#26399;<input v-model="form.deliveryDate" placeholder="20250515" /></label>
        <label class="inline-check"><input v-model="form.urgent" type="checkbox" /> &#24613;&#20214;</label>
        <label>&#22294;&#29255;&#32178;&#22336;<input v-model="form.image" placeholder="/src/assets/order-placeholder.svg" /></label>
        <label>&#36008;&#27454;&#37329;&#38989;<input v-model.number="form.amount" type="number" min="0" /></label>
        <label>&#31237;&#37329;<input v-model.number="form.tax" type="number" min="0" /></label>
        <label>&#23614;&#27454;<input v-model.number="form.balance" type="number" min="0" /></label>
        <div class="form-actions">
          <button type="submit" :disabled="saving">{{ saving ? "儲存中..." : "建立訂單" }}</button>
          <button type="button" @click="goBack">&#21462;&#28040;</button>
        </div>
      </form>
    </main>
  `,
};
