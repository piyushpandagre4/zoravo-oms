# Supabase Password Reset Email Template

## Instructions
1. Go to your Supabase Dashboard → Authentication → Email Templates
2. Select "Reset Password" template
3. Copy and paste the HTML below into the "Body" field
4. Update the Subject line as shown below
5. Click "Save changes"

---

## Subject Line
```
Reset Your ZORAVO OMS Password
```

---

## Body (HTML Template)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - ZORAVO OMS</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .email-container {
            padding: 40px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #06b6d4;
        }
        .logo-text {
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .logo-subtitle {
            font-size: 14px;
            color: #6b7280;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }
        .logo-separator {
            display: inline-block;
            width: 2px;
            height: 20px;
            background-color: #06b6d4;
            margin: 0 8px;
            vertical-align: middle;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 10px;
            text-align: center;
        }
        .subtitle {
            font-size: 16px;
            color: #6b7280;
            text-align: center;
            margin-bottom: 30px;
        }
        .content {
            margin-bottom: 30px;
        }
        .greeting {
            font-size: 16px;
            color: #374151;
            margin-bottom: 20px;
        }
        .message {
            font-size: 15px;
            color: #4b5563;
            line-height: 1.8;
            margin-bottom: 25px;
        }
        .cta-container {
            text-align: center;
            margin: 30px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
            color: #ffffff !important;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(37, 99, 235, 0.4);
        }
        .info-box {
            background-color: #eff6ff;
            border-left: 4px solid #2563eb;
            padding: 16px;
            margin: 25px 0;
            border-radius: 6px;
        }
        .info-box-title {
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .info-box-content {
            font-size: 14px;
            color: #1e40af;
            line-height: 1.6;
        }
        .security-note {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 25px 0;
            border-radius: 6px;
        }
        .security-note-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .security-note-content {
            font-size: 14px;
            color: #92400e;
            line-height: 1.6;
        }
        .alternative-link {
            margin-top: 25px;
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
        }
        .alternative-link-title {
            font-size: 13px;
            font-weight: 600;
            color: #6b7280;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .alternative-link-url {
            font-size: 12px;
            color: #2563eb;
            word-break: break-all;
            font-family: 'Courier New', monospace;
            background-color: #ffffff;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
        }
        .footer {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 13px;
            line-height: 1.6;
        }
        .footer-text {
            margin-bottom: 10px;
        }
        .footer-link {
            color: #2563eb;
            text-decoration: none;
        }
        .footer-link:hover {
            text-decoration: underline;
        }
        .divider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 25px 0;
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                padding: 20px;
            }
            .title {
                font-size: 20px;
            }
            .cta-button {
                padding: 14px 30px;
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <!-- Header -->
            <div class="header">
                <div class="logo-text">
                    ZORAVO<span class="logo-separator"></span>OMS
                </div>
                <div class="logo-subtitle">Order Management System</div>
            </div>

            <!-- Title -->
            <h1 class="title">Reset Your Password</h1>
            <p class="subtitle">We received a request to reset your password</p>

            <!-- Content -->
            <div class="content">
                <div class="greeting">
                    Hello,
                </div>
                
                <div class="message">
                    We received a request to reset the password for your ZORAVO OMS account associated with <strong>{{ .Email }}</strong>.
                </div>

                <div class="message">
                    Click the button below to reset your password. This link will expire in 1 hour for security reasons.
                </div>

                <!-- CTA Button -->
                <div class="cta-container">
                    <a href="{{ .ConfirmationURL }}" class="cta-button">
                        Reset Password
                    </a>
                </div>

                <!-- Alternative Link -->
                <div class="alternative-link">
                    <div class="alternative-link-title">Or copy and paste this link:</div>
                    <div class="alternative-link-url">{{ .ConfirmationURL }}</div>
                </div>

                <!-- Security Note -->
                <div class="security-note">
                    <div class="security-note-title">🔒 Security Notice</div>
                    <div class="security-note-content">
                        If you didn't request this password reset, please ignore this email. Your password will remain unchanged. For security, this link expires in 1 hour.
                    </div>
                </div>

                <!-- Info Box -->
                <div class="info-box">
                    <div class="info-box-title">💡 Need Help?</div>
                    <div class="info-box-content">
                        If you're having trouble resetting your password, please contact our support team at <a href="mailto:support@zoravo.com" style="color: #1e40af; text-decoration: underline;">support@zoravo.com</a> or visit our help center.
                    </div>
                </div>
            </div>

            <!-- Divider -->
            <div class="divider"></div>

            <!-- Footer -->
            <div class="footer">
                <div class="footer-text">
                    This email was sent to <strong>{{ .Email }}</strong>
                </div>
                <div class="footer-text">
                    © {{ .SiteURL }} - ZORAVO OMS. All rights reserved.
                </div>
                <div class="footer-text" style="margin-top: 15px;">
                    <a href="{{ .SiteURL }}" class="footer-link">Visit ZORAVO OMS</a> | 
                    <a href="{{ .SiteURL }}/login" class="footer-link">Sign In</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## Available Variables

Supabase provides these variables you can use in the template:

- `{{ .ConfirmationURL }}` - The password reset link (use this for the button)
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your site URL
- `{{ .Token }}` - Reset token (usually not needed)
- `{{ .TokenHash }}` - Hashed token (usually not needed)
- `{{ .RedirectTo }}` - Redirect URL after reset
- `{{ .Data }}` - Additional data

---

## Features

✅ **Professional Design** - Matches ZORAVO OMS branding  
✅ **Responsive** - Works on mobile and desktop  
✅ **Clear CTA** - Prominent "Reset Password" button  
✅ **Security Messaging** - Explains link expiration and security  
✅ **Alternative Link** - Shows URL if button doesn't work  
✅ **Help Section** - Provides support contact information  
✅ **Brand Colors** - Uses your blue gradient (#2563eb to #4f46e5)  
✅ **Modern Styling** - Clean, professional appearance  

---

## Preview Tips

1. After saving, use the "Preview" tab in Supabase to see how it looks
2. Test the email by requesting a password reset
3. The template will automatically use your actual site URL and user email
4. The reset link will work with your `/reset-password` page we created

---

## Customization

You can customize:
- Support email address (currently `support@zoravo.com`)
- Colors (currently using #2563eb blue and #06b6d4 cyan)
- Expiration time message (currently says 1 hour)
- Footer links and text

