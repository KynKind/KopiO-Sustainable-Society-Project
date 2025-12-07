"""
Email service for sending verification emails
"""
import smtplib
import secrets
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from config import Config
import logging

logger = logging.getLogger(__name__)

def generate_verification_token():
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)

def send_verification_email(to_email, first_name, verification_token):
    """Send verification email to user"""
    try:
        # Create verification link
        verification_link = f"{Config.FRONTEND_URL}/html/verify_email.html?token={verification_token}"
        
        # Create email
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Verify your Kopi-O account'
        msg['From'] = Config.MAIL_DEFAULT_SENDER
        msg['To'] = to_email
        
        # HTML email body
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Poppins', Arial, sans-serif; background-color: #F5F5DC; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 4px 12px rgba(139, 69, 19, 0.15); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 32px; color: #8B4513; font-weight: 700; }}
                h1 {{ color: #654321; }}
                p {{ color: #333; line-height: 1.6; }}
                .btn {{ display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #8B4513, #A0522D); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 20px 0; }}
                .footer {{ margin-top: 30px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">☕ Kopi-O</div>
                </div>
                <h1>Welcome, {first_name}!</h1>
                <p>Thank you for registering with Kopi-O Sustainable Society. Please verify your email address to activate your account and start earning points!</p>
                <p style="text-align: center;">
                    <a href="{verification_link}" class="btn">Verify My Email</a>
                </p>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 8px; font-size: 12px;">{verification_link}</p>
                <p>This link will expire in 24 hours.</p>
                <div class="footer">
                    <p>If you didn't create an account, you can safely ignore this email.</p>
                    <p>&copy; 2025 Kopi-O Sustainable Society, MMU Cyberjaya</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text = f"""
        Welcome to Kopi-O, {first_name}!
        
        Please verify your email by clicking this link:
        {verification_link}
        
        This link expires in 24 hours.
        
        If you didn't create an account, ignore this email.
        """
        
        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))
        
        # Send email
        if Config.MAIL_USERNAME and Config.MAIL_PASSWORD:
            with smtplib.SMTP(Config.MAIL_SERVER, Config.MAIL_PORT) as server:
                server.starttls()
                server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
                server.sendmail(Config.MAIL_DEFAULT_SENDER, to_email, msg.as_string())
            logger.info(f"Verification email sent to {to_email}")
            return True
        else:
            # Development mode - just log the link
            logger.warning(f"Email not configured. Verification link: {verification_link}")
            print(f"\n📧 VERIFICATION LINK (dev mode): {verification_link}\n")
            return True
            
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
        return False
