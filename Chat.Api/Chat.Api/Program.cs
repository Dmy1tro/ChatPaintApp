using System.Text;
using Chat.Api.Hubs;
using Chat.Api.Middleware;
using Chat.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            // Disabling validation for testing purposes.
            ValidateAudience = false,
            ValidateIssuer = false,
            ValidateActor = false,
            ValidateIssuerSigningKey = false,
            ValidateLifetime = false,
            ValidateTokenReplay = false,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("key-key-key-key-key-key"))
        };

        options.Events ??= new JwtBearerEvents();
        options.Events.OnMessageReceived = context =>
        {
            // For some reason signalR send token in query parameter and dont provide configuration for this.
            // Why microsoft, WHY ????
            if (context.Request.Query.TryGetValue("access_token", out var tokenFromQueryParam))
            {
                context.Token = tokenFromQueryParam.ToString();
            }

            if (context.Request.Headers.TryGetValue("Authentication", out var tokenFromHeader))
            {
                context.Token = tokenFromQueryParam.ToString();
            }

            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddControllers();
builder.Services.AddSignalR(options =>
{
    options.AddFilter<GetUserFromAuthHubFilter>();
});
builder.Services.AddCors(setup =>
{
    setup.AddPolicy(
        "AngularApp",
        policy => policy.WithOrigins("http://localhost:4200")
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials());
});

builder.Services.AddScoped<UserProvider>();
builder.Services.AddScoped<ChatManager>();
builder.Services.AddScoped<PaintManager>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AngularApp");

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<GetUserFromAuthMiddleware>();

app.MapControllers();
app.MapHub<ChatHub>("api/chat");
app.MapHub<PaintHub>("api/paint");

app.Run();
