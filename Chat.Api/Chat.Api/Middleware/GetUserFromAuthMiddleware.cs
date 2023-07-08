using System.Security.Claims;
using System.Security.Principal;
using Chat.Api.Services;
using Microsoft.AspNetCore.SignalR;

namespace Chat.Api.Middleware
{
    public class GetUserFromAuthMiddleware
    {
        private readonly RequestDelegate _next;

        public GetUserFromAuthMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, UserProvider userProvider)
        {
            if (context.User.Identity is { IsAuthenticated: true })
            {
                userProvider.SetUser(context.User.Identity as ClaimsIdentity);
            }

            await _next(context);
        }
    }

    public class GetUserFromAuthHubFilter : IHubFilter
    {
        private readonly UserProvider _userProvider;

        public GetUserFromAuthHubFilter(UserProvider userProvider)
        {
            _userProvider = userProvider;
        }

        public ValueTask<object?> InvokeMethodAsync(HubInvocationContext invocationContext, Func<HubInvocationContext, ValueTask<object?>> next)
        {
            SetUser(invocationContext.Context.User.Identity);

            return next(invocationContext);
        }

        public Task OnConnectedAsync(HubLifetimeContext context, Func<HubLifetimeContext, Task> next)
        {
            SetUser(context.Context.User.Identity);

            return next(context);
        }

        public Task OnDisconnectedAsync(HubLifetimeContext context, Exception? exception, Func<HubLifetimeContext, Exception?, Task> next)
        {
            SetUser(context.Context.User.Identity);

            return next(context, exception);
        }

        private void SetUser(IIdentity identity)
        {
            if (identity is { IsAuthenticated: true })
            {
                _userProvider.SetUser(identity as ClaimsIdentity);
            }
        }
    }
}
