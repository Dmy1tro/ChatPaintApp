using System.Security.Claims;

namespace Chat.Api.Services
{
    public class UserProvider
    {
        private ClaimsIdentity _identity;

        public void SetUser(ClaimsIdentity identity)
        {
            _identity = identity;
        }

        public string GetUserId()
        {
            return _identity.Claims.First(c => c.Type == ClaimTypes.Upn).Value;
        }
    }
}
