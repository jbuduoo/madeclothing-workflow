import { api } from "../api";
import logoUrl from "../assets/logoweb.png";

export default {
  data() {
    return { username: "", password: "", rememberMe: false, error: "", logoUrl };
  },
  mounted() {
    const savedUsername = localStorage.getItem("rememberedUsername");
    if (savedUsername) {
      this.username = savedUsername;
      this.rememberMe = true;
    }
  },
  methods: {
    async handleLogin() {
      this.error = "";
      if (this.rememberMe) localStorage.setItem("rememberedUsername", this.username);
      else localStorage.removeItem("rememberedUsername");

      try {
        const response = await api.post("/login", { username: this.username, password: this.password });
        if (response.data.success) {
          this.$router.push({ name: "Dashboard", query: { username: this.username } });
          return;
        }
        this.error = response.data.message || "帳號或密碼錯誤";
      } catch (error) {
        this.error = error.response?.data?.message || "伺服器連線失敗";
      }
    },
  },
  template: `
    <main class="login-page">
      <div>
        <div class="logo"><img :src="logoUrl" alt="公司標誌" /></div>
        <section class="login-box">
          <h1>內部作業平台</h1>
          <hr />
          <p>請輸入您的帳號密碼</p>
          <form @submit.prevent="handleLogin">
            <label>帳號：<input v-model="username" type="text" placeholder="請輸入帳號" autocomplete="username" /></label>
            <label>密碼：<input v-model="password" type="password" placeholder="請輸入密碼" autocomplete="current-password" /></label>
            <label class="remember"><input v-model="rememberMe" type="checkbox" /> 記住帳號</label>
            <p v-if="error" class="error">{{ error }}</p>
            <button type="submit">登入</button>
          </form>
        </section>
      </div>
    </main>
  `,
};
