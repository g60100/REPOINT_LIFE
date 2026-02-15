// 로그인 페이지 스크립트
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form')
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      const email = document.getElementById('email').value.trim()
      const password = document.getElementById('password').value
      
      // 폼 검증
      if (!email || !email.includes('@')) {
        showToast('올바른 이메일 주소를 입력해주세요', 'warning')
        return
      }
      
      if (!password) {
        showToast('비밀번호를 입력해주세요', 'warning')
        return
      }
      
      const success = await AppState.login(email, password)
      if (success) {
        setTimeout(() => {
          window.location.href = '/'
        }, 1000)
      }
    })
  }
})
