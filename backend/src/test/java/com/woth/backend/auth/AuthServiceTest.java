package com.woth.backend.auth;

import com.woth.backend.user.User;
import com.woth.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailVerificationService emailVerificationService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Test
    void loginWithOAuthReleasesWithdrawnProviderIdBeforeReSignup() {
        AuthService authService = new AuthService(userRepository, emailVerificationService, passwordEncoder);
        String email = "member@example.com";
        String provider = OAuthProvider.GOOGLE.key();
        String providerId = "google-provider-id";
        User withdrawnUser = User.builder()
                .id(42L)
                .email("withdrawn-42-old@deleted.local")
                .password("old-password")
                .nickname("withdrawn")
                .authProvider(provider)
                .authProviderId(providerId)
                .isDeleted(true)
                .build();

        given(userRepository.findByAuthProviderIgnoreCaseAndAuthProviderIdAndIsDeletedFalse(provider, providerId))
                .willReturn(Optional.empty());
        given(userRepository.findByEmailAndAuthProviderIgnoreCaseAndIsDeletedFalse(email, provider))
                .willReturn(Optional.empty());
        given(userRepository.findByAuthProviderIgnoreCaseAndAuthProviderId(provider, providerId))
                .willReturn(Optional.of(withdrawnUser));
        given(userRepository.findByEmailAndAuthProviderIgnoreCase(email, provider))
                .willReturn(Optional.empty());
        given(passwordEncoder.encode(anyString())).willReturn("encoded-password");
        given(userRepository.save(any(User.class))).willAnswer(invocation -> invocation.getArgument(0));

        User signedUpUser = authService.loginWithOAuth(new OAuthProfile(
                OAuthProvider.GOOGLE,
                providerId,
                email,
                "member"
        ));

        assertThat(withdrawnUser.getEmail()).startsWith("withdrawn-42-");
        assertThat(withdrawnUser.getAuthProviderId()).isNull();
        assertThat(signedUpUser.getEmail()).isEqualTo(email);
        assertThat(signedUpUser.getAuthProvider()).isEqualTo(provider);
        assertThat(signedUpUser.getAuthProviderId()).isEqualTo(providerId);
        verify(userRepository).flush();
    }
}
