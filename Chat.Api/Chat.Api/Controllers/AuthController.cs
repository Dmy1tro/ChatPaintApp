using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace Chat.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        [HttpPost("authorize")]
        public async Task<IActionResult> Authorize()
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var token = new JwtSecurityToken(
                issuer: "issuer",
                audience: "audience",
                claims: new[]
                {
                    new Claim(ClaimTypes.Upn, Guid.NewGuid().ToString())
                },
                expires: DateTime.UtcNow.AddDays(14),
                signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes("key-key-key-key-key-key")), SecurityAlgorithms.HmacSha256));

            var jwtToken = tokenHandler.WriteToken(token);

            return Ok(new
            {
                AccessToken = jwtToken
            });
        }
    }
}
