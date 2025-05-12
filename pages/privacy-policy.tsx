import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const PrivacyPolicy = () => {
  return (
    <>
      <Head>
        <title>Privacy Policy - FocusFlow</title>
        <meta name="description" content="Privacy Policy for FocusFlow application" />
      </Head>
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Privacy Policy</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose dark:prose-invert max-w-none">
            <h2 className="text-2xl font-semibold mt-8 mb-4">Introduction</h2>
            <p>
              Welcome to FocusFlow ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you about how we look after your personal data when you visit our website and use our services, 
              and tell you about your privacy rights and how the law protects you.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Information We Collect</h2>
            <p>We collect several types of information from and about users of our website, including:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Personal identifiers such as name and email address when you create an account</li>
              <li>Authentication data from third-party providers if you choose to sign in with Google or GitHub</li>
              <li>Task and mood data that you input into the application</li>
              <li>Usage data and analytics to improve our service</li>
              <li>Device and browser information for optimization purposes</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">How We Use Your Information</h2>
            <p>We use the information we collect about you for various purposes, including:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>To provide and maintain our service</li>
              <li>To personalize your experience and deliver content relevant to your tasks and moods</li>
              <li>To improve our website and services</li>
              <li>To communicate with you about updates or changes to our service</li>
              <li>To provide customer support</li>
              <li>To detect, prevent, and address technical issues</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Data Storage and Security</h2>
            <p>
              We use Supabase to store your data securely. All data is encrypted in transit and at rest. 
              We implement appropriate technical and organizational measures to protect your personal data 
              against unauthorized or unlawful processing, accidental loss, destruction, or damage.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Third-Party Services</h2>
            <p>
              We use third-party services that may collect information used to identify you:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Google Authentication for sign-in functionality</li>
              <li>GitHub Authentication for sign-in functionality</li>
              <li>Vercel for hosting our application</li>
              <li>Supabase for database services</li>
              <li>Google Gemini API for AI-powered recommendations</li>
            </ul>
            <p>
              Each of these services has their own Privacy Policy addressing how they use such information.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Your Data Rights</h2>
            <p>Depending on your location, you may have certain rights regarding your personal data, including:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>The right to access your personal data</li>
              <li>The right to rectification of your personal data</li>
              <li>The right to erasure of your personal data</li>
              <li>The right to restrict processing of your personal data</li>
              <li>The right to data portability</li>
              <li>The right to object to processing of your personal data</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Children's Privacy</h2>
            <p>
              Our service is not intended for children under the age of 13. We do not knowingly collect personal 
              information from children under 13. If you are a parent or guardian and you are aware that your child 
              has provided us with personal information, please contact us.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date at the top of this page.
            </p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              <a href="mailto:privacy@focusflow.app" className="text-primary-500 hover:text-primary-700">
                privacy@focusflow.app
              </a>
            </p>
          </div>
        </div>
        
        <div className="text-center mb-8">
          <Link href="/" className="text-primary-500 hover:text-primary-700">
            Return to Home
          </Link>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
