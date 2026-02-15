// 회원가입 페이지 스크립트
document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-form')
  
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      const name = document.getElementById('name').value.trim()
      const email = document.getElementById('email').value.trim()
      const phone = document.getElementById('phone').value.trim()
      const password = document.getElementById('password').value
      const confirmPassword = document.getElementById('confirm-password').value
      
      // 폼 검증
      if (!name || name.length < 2) {
        showToast('이름은 2자 이상 입력해주세요', 'warning')
        return
      }
      
      if (!email || !email.includes('@')) {
        showToast('올바른 이메일 주소를 입력해주세요', 'warning')
        return
      }
      
      if (!phone || phone.length < 10) {
        showToast('올바른 전화번호를 입력해주세요', 'warning')
        return
      }
      
      if (!password || password.length < 6) {
        showToast('비밀번호는 6자 이상 입력해주세요', 'warning')
        return
      }
      
      if (password !== confirmPassword) {
        showToast('비밀번호가 일치하지 않습니다', 'warning')
        return
      }
      
      const success = await AppState.signup(email, password, name, phone)
      if (success) {
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      }
    })
  }
})
